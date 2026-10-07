-- One active checkout per asset.
-- Run only after a verified SQL Server backup and explicit approval.
-- Stops without changes when an asset already has more than one active checkout; resolve those
-- rows (cancel or return the extra checkout) before applying.

IF EXISTS (
  SELECT [assetId]
  FROM [dbo].[asset_checkouts]
  WHERE [transactionStatus] = N'active' AND [isReturned] = 0
  GROUP BY [assetId]
  HAVING COUNT(*) > 1
)
BEGIN
  THROW 51010, N'Some assets have more than one active checkout. Resolve them before adding UX_asset_checkouts_active_assetId.', 1;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'[dbo].[asset_checkouts]')
    AND name = N'UX_asset_checkouts_active_assetId'
)
BEGIN
  EXEC sys.sp_executesql N'CREATE UNIQUE INDEX [UX_asset_checkouts_active_assetId]
    ON [dbo].[asset_checkouts]([assetId])
    WHERE [transactionStatus] = N''active'' AND [isReturned] = 0;';
END;
