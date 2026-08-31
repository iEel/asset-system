-- Add explicit permanent-assignment versus temporary-loan semantics to Checkout.
-- Run only after a verified SQL Server backup and explicit operator approval.
-- The data backfill is intentionally limited to two operator-confirmed active assignments.

SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF COL_LENGTH('dbo.asset_checkouts', 'handoverMode') IS NULL
  BEGIN
    ALTER TABLE [dbo].[asset_checkouts] ADD [handoverMode] NVARCHAR(30) NULL;
  END;

  IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE [parent_object_id] = OBJECT_ID(N'[dbo].[asset_checkouts]')
      AND [name] = N'CK_asset_checkouts_handoverMode'
  )
  BEGIN
    ALTER TABLE [dbo].[asset_checkouts] WITH CHECK
      ADD CONSTRAINT [CK_asset_checkouts_handoverMode]
      CHECK ([handoverMode] IS NULL OR [handoverMode] IN (N'permanent_assignment', N'temporary_loan'));
  END;

  DECLARE @Approved TABLE (
    [assetTag] NVARCHAR(50) NOT NULL PRIMARY KEY,
    [documentNo] NVARCHAR(50) NOT NULL UNIQUE
  );

  INSERT INTO @Approved ([assetTag], [documentNo])
  VALUES
    (N'GRL-COM-06-0001', N'HO-202606-0002'),
    (N'SNI-EQU-19-0336', N'HO-202608-0003');

  DECLARE @InUseStatusId NVARCHAR(1000);
  DECLARE @CheckedOutStatusId NVARCHAR(1000);

  IF (SELECT COUNT(*) FROM [dbo].[asset_statuses] WITH (UPDLOCK, HOLDLOCK) WHERE [name] = N'In Use' AND [isActive] = 1) <> 1
    THROW 51001, 'Expected exactly one active In Use asset status.', 1;

  IF (SELECT COUNT(*) FROM [dbo].[asset_statuses] WITH (UPDLOCK, HOLDLOCK) WHERE [name] = N'Checked Out' AND [isActive] = 1) <> 1
    THROW 51002, 'Expected exactly one active Checked Out asset status.', 1;

  SELECT @InUseStatusId = [id]
  FROM [dbo].[asset_statuses] WITH (UPDLOCK, HOLDLOCK)
  WHERE [name] = N'In Use' AND [isActive] = 1;

  SELECT @CheckedOutStatusId = [id]
  FROM [dbo].[asset_statuses] WITH (UPDLOCK, HOLDLOCK)
  WHERE [name] = N'Checked Out' AND [isActive] = 1;

  DECLARE @Resolved TABLE (
    [assetId] NVARCHAR(1000) NOT NULL PRIMARY KEY,
    [checkoutId] NVARCHAR(1000) NOT NULL UNIQUE,
    [assetTag] NVARCHAR(50) NOT NULL,
    [documentNo] NVARCHAR(50) NOT NULL,
    [oldStatusId] NVARCHAR(1000) NOT NULL,
    [oldAfterSnapshotJson] NVARCHAR(MAX) NULL
  );

  INSERT INTO @Resolved (
    [assetId], [checkoutId], [assetTag], [documentNo], [oldStatusId], [oldAfterSnapshotJson]
  )
  SELECT
    a.[id], c.[id], a.[assetTag], c.[documentNo], a.[statusId], c.[afterSnapshotJson]
  FROM @Approved approved
  INNER JOIN [dbo].[assets] a WITH (UPDLOCK, HOLDLOCK)
    ON a.[assetTag] = approved.[assetTag]
  INNER JOIN [dbo].[asset_checkouts] c WITH (UPDLOCK, HOLDLOCK)
    ON c.[assetId] = a.[id]
   AND c.[documentNo] = approved.[documentNo]
  WHERE c.[transactionStatus] = N'active'
    AND c.[isReturned] = 0
    AND c.[checkoutType] = N'user'
    AND c.[custodianId] IS NOT NULL
    AND c.[expectedReturnDate] IS NULL
    AND c.[handoverMode] IS NULL
    AND a.[isActive] = 1
    AND a.[statusId] = @CheckedOutStatusId
    AND NOT EXISTS (
      SELECT 1
      FROM [dbo].[asset_checkins] ci WITH (UPDLOCK, HOLDLOCK)
      WHERE ci.[checkoutId] = c.[id]
        AND ci.[transactionStatus] = N'active'
    );

  IF (SELECT COUNT(*) FROM @Resolved) <> 2
    THROW 51003, 'Approved handover records do not match all required preconditions.', 1;

  IF EXISTS (
    SELECT 1
    FROM @Approved approved
    LEFT JOIN @Resolved resolved
      ON resolved.[assetTag] = approved.[assetTag]
     AND resolved.[documentNo] = approved.[documentNo]
    WHERE resolved.[assetId] IS NULL
  )
    THROW 51004, 'At least one approved asset and Checkout document pair is missing.', 1;

  IF (
    SELECT COUNT(*)
    FROM [dbo].[asset_checkouts] c WITH (UPDLOCK, HOLDLOCK)
    INNER JOIN [dbo].[assets] a WITH (UPDLOCK, HOLDLOCK) ON a.[id] = c.[assetId]
    WHERE c.[transactionStatus] = N'active'
      AND c.[isReturned] = 0
      AND c.[checkoutType] = N'user'
      AND c.[custodianId] IS NOT NULL
      AND c.[expectedReturnDate] IS NULL
      AND c.[handoverMode] IS NULL
      AND a.[isActive] = 1
      AND a.[statusId] = @CheckedOutStatusId
  ) <> 2
    THROW 51005, 'The active indefinite user Checkout candidate set is not exactly the approved two records.', 1;

  IF EXISTS (
    SELECT 1
    FROM @Resolved resolved
    WHERE resolved.[oldAfterSnapshotJson] IS NOT NULL
      AND (
        ISJSON(resolved.[oldAfterSnapshotJson]) <> 1
        OR JSON_VALUE(resolved.[oldAfterSnapshotJson], '$.statusId') IS NULL
        OR JSON_VALUE(resolved.[oldAfterSnapshotJson], '$.statusId') <> @CheckedOutStatusId
      )
  )
    THROW 51006, 'A Checkout after snapshot is invalid or does not contain the expected Checked Out status.', 1;

  UPDATE c
  SET
    c.[handoverMode] = N'permanent_assignment',
    c.[afterSnapshotJson] = CASE
      WHEN c.[afterSnapshotJson] IS NOT NULL AND ISJSON(c.[afterSnapshotJson]) = 1
        THEN JSON_MODIFY(c.[afterSnapshotJson], '$.statusId', @InUseStatusId)
      ELSE c.[afterSnapshotJson]
    END,
    c.[updatedAt] = SYSUTCDATETIME()
  FROM [dbo].[asset_checkouts] c
  INNER JOIN @Resolved resolved ON resolved.[checkoutId] = c.[id];

  UPDATE a
  SET
    a.[statusId] = @InUseStatusId,
    a.[updatedBy] = N'migration:handover-mode-backfill',
    a.[updatedAt] = SYSUTCDATETIME()
  FROM [dbo].[assets] a
  INNER JOIN @Resolved resolved ON resolved.[assetId] = a.[id];

  INSERT INTO [dbo].[asset_movements] (
    [id], [assetId], [movementType], [fromValue], [toValue], [reason],
    [referenceType], [referenceId], [performedBy], [performedAt], [remark]
  )
  SELECT
    CONVERT(NVARCHAR(1000), NEWID()),
    resolved.[assetId],
    N'status_change',
    resolved.[oldStatusId],
    @InUseStatusId,
    N'Backfilled operator-confirmed permanent assignment handover mode',
    N'checkout',
    resolved.[checkoutId],
    N'migration:handover-mode-backfill',
    SYSUTCDATETIME(),
    CONCAT(N'Asset ', resolved.[assetTag], N'; Checkout ', resolved.[documentNo])
  FROM @Resolved resolved;

  INSERT INTO [dbo].[system_logs] (
    [id], [userId], [action], [module], [recordId], [oldValue], [newValue],
    [ipAddress], [userAgent], [remark], [createdAt]
  )
  SELECT
    CONVERT(NVARCHAR(1000), NEWID()),
    NULL,
    N'migration_backfill',
    N'asset',
    resolved.[assetId],
    (
      SELECT
        resolved.[assetTag] AS [assetTag],
        resolved.[documentNo] AS [documentNo],
        resolved.[oldStatusId] AS [statusId],
        CAST(NULL AS NVARCHAR(30)) AS [handoverMode],
        resolved.[oldAfterSnapshotJson] AS [afterSnapshotJson]
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES
    ),
    (
      SELECT
        resolved.[assetTag] AS [assetTag],
        resolved.[documentNo] AS [documentNo],
        @InUseStatusId AS [statusId],
        N'permanent_assignment' AS [handoverMode],
        c.[afterSnapshotJson] AS [afterSnapshotJson]
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES
    ),
    NULL,
    N'manual-migration',
    N'Operator-approved permanent assignment backfill; old snapshot retained in oldValue',
    SYSUTCDATETIME()
  FROM @Resolved resolved
  INNER JOIN [dbo].[asset_checkouts] c ON c.[id] = resolved.[checkoutId];

  IF EXISTS (
    SELECT 1
    FROM @Resolved resolved
    INNER JOIN [dbo].[asset_checkouts] c ON c.[id] = resolved.[checkoutId]
    INNER JOIN [dbo].[assets] a ON a.[id] = resolved.[assetId]
    WHERE c.[handoverMode] <> N'permanent_assignment'
      OR c.[transactionStatus] <> N'active'
      OR c.[isReturned] <> 0
      OR c.[expectedReturnDate] IS NOT NULL
      OR a.[statusId] <> @InUseStatusId
      OR (c.[afterSnapshotJson] IS NOT NULL AND JSON_VALUE(c.[afterSnapshotJson], '$.statusId') <> @InUseStatusId)
  )
    THROW 51007, 'Handover mode backfill postconditions failed.', 1;

  IF (SELECT COUNT(*) FROM [dbo].[asset_movements] movement INNER JOIN @Resolved resolved ON resolved.[checkoutId] = movement.[referenceId] WHERE movement.[performedBy] = N'migration:handover-mode-backfill') <> 2
    THROW 51008, 'Expected exactly two migration asset movements.', 1;

  IF (SELECT COUNT(*) FROM [dbo].[system_logs] log INNER JOIN @Resolved resolved ON resolved.[assetId] = log.[recordId] WHERE log.[action] = N'migration_backfill' AND log.[userAgent] = N'manual-migration') <> 2
    THROW 51009, 'Expected exactly two migration system logs.', 1;

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0
    ROLLBACK TRANSACTION;
  THROW;
END CATCH;
