import { NextRequest, NextResponse } from "next/server"
import {
  integrationErrorResponse,
  logIntegrationApiAccess,
  requireIntegrationScope,
} from "@/lib/integration-auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  let requestId: string | undefined
  try {
    const context = await requireIntegrationScope(request, "integration:read")
    requestId = context.requestId

    await logIntegrationApiAccess({
      request,
      context,
      action: "integration_openapi",
      route: "/api/integrations/v1/openapi",
      status: 200,
      resultCount: 1,
    })

    return NextResponse.json(buildIntegrationOpenApiSpec(), {
      headers: { "x-request-id": context.requestId },
    })
  } catch (error) {
    return integrationErrorResponse(error, requestId)
  }
}

function buildIntegrationOpenApiSpec() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Asset Management Integration API",
      version: "1.0.0",
      description: "Read-only API surface for trusted external systems.",
    },
    servers: [{ url: "/api/integrations/v1" }],
    security: [{ bearerAuth: [] }],
    paths: {
      "/health": {
        get: {
          operationId: "getIntegrationHealth",
          summary: "Validate the integration bearer token",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Authenticated integration client" } },
        },
      },
      "/assets": {
        get: {
          operationId: "listAssets",
          summary: "List operational asset records",
          security: [{ bearerAuth: [] }],
          parameters: [
            queryParam("q", "string", "Search asset tag, serial number, name, or current custodian employee code."),
            queryParam("assetTag", "string", "Filter by asset tag."),
            queryParam("serialNumber", "string", "Filter by serial number."),
            queryParam("employeeCode", "string", "Filter by current custodian employee code."),
            queryParam("companyCode", "string", "Filter by owner company code."),
            queryParam("branchCode", "string", "Filter by owner branch code."),
            queryParam("locationCode", "string", "Filter by current location code."),
            queryParam("status", "string", "Filter by lifecycle status code."),
            queryParam("condition", "string", "Filter by physical condition code."),
            queryParam("page", "integer", "Page number, starting at 1."),
            queryParam("limit", "integer", "Page size capped by the server."),
          ],
          responses: { "200": { description: "Asset list", content: jsonSchemaRef("AssetListResponse") } },
        },
      },
      "/assets/{assetTag}": {
        get: {
          operationId: "getAssetByTag",
          summary: "Get one operational asset record by Asset Tag",
          security: [{ bearerAuth: [] }],
          parameters: [pathParam("assetTag", "string", "Asset Tag.")],
          responses: {
            "200": { description: "Asset detail", content: jsonSchemaRef("AssetResponse") },
            "404": { description: "Asset was not found" },
          },
        },
      },
      "/assets/changes": {
        get: {
          operationId: "listAssetChanges",
          summary: "List asset records updated since a point in time",
          "x-canonicalRoute": "/api/integrations/v1/assets/changes",
          security: [{ bearerAuth: [] }],
          parameters: [
            queryParam("updatedSince", "string", "Required ISO datetime for incremental sync."),
            queryParam("cursor", "string", "Opaque cursor returned from the previous page."),
            queryParam("limit", "integer", "Page size capped by the server."),
          ],
          responses: { "200": { description: "Incremental asset changes", content: jsonSchemaRef("AssetChangeResponse") } },
        },
      },
      "/reference/statuses": referencePath("listReferenceStatuses", "List active lifecycle statuses"),
      "/reference/companies": referencePath("listReferenceCompanies", "List active companies"),
      "/reference/branches": {
        get: {
          operationId: "listReferenceBranches",
          summary: "List active branches",
          security: [{ bearerAuth: [] }],
          parameters: [queryParam("companyCode", "string", "Optional owner company code filter.")],
          responses: { "200": { description: "Branch references", content: jsonSchemaRef("ReferenceResponse") } },
        },
      },
      "/reference/locations": {
        get: {
          operationId: "listReferenceLocations",
          summary: "List active locations",
          "x-canonicalRoute": "/api/integrations/v1/reference/locations",
          security: [{ bearerAuth: [] }],
          parameters: [
            queryParam("companyCode", "string", "Optional company code filter."),
            queryParam("branchCode", "string", "Optional branch code filter."),
          ],
          responses: { "200": { description: "Location references", content: jsonSchemaRef("ReferenceResponse") } },
        },
      },
      "/openapi": {
        get: {
          operationId: "getIntegrationOpenApi",
          summary: "Get this authenticated OpenAPI document",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "OpenAPI document" } },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer" },
      },
      schemas: {
        Asset: {
          type: "object",
          additionalProperties: true,
          description: "Stable operational asset DTO without purchase, supplier, accounting, photo, or attachment fields.",
        },
        AssetListResponse: responseSchema("Array of Asset records with paging metadata."),
        AssetResponse: responseSchema("Single Asset record."),
        AssetChangeResponse: responseSchema("Array of Asset records with highWaterMark and nextCursor metadata."),
        ReferenceResponse: responseSchema("Array of compact reference code/name records."),
      },
    },
  }
}

function queryParam(name: string, type: string, description: string) {
  return { name, in: "query", required: false, schema: { type }, description }
}

function pathParam(name: string, type: string, description: string) {
  return { name, in: "path", required: true, schema: { type }, description }
}

function jsonSchemaRef(schemaName: string) {
  return {
    "application/json": {
      schema: { $ref: `#/components/schemas/${schemaName}` },
    },
  }
}

function referencePath(operationId: string, summary: string) {
  return {
    get: {
      operationId,
      summary,
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Reference records", content: jsonSchemaRef("ReferenceResponse") } },
    },
  }
}

function responseSchema(description: string) {
  return {
    type: "object",
    description,
    properties: {
      data: {},
      meta: {
        type: "object",
        properties: {
          requestId: { type: "string" },
        },
      },
    },
  }
}
