# Document Service

The Document Service exposes a simple REST API that powers the document grid in the frontend. The
service provides in-memory or local-disk content storage, persists document metadata to a JSON file
and writes audit entries to the shared `IAuditStore` contract.

## Authentication and roles

The service uses a lightweight bearer-token handler for local development.

Token | Roles
----- | -----
`Bearer reader` | `DocumentReader`
`Bearer editor` | `DocumentEditor`, `DocumentReader`

The following policies are enforced:

* `DocumentReaderPolicy` – required for listing, viewing, searching and downloading documents.
* `DocumentEditorPolicy` – required for uploading or deleting documents.

## Storage configuration

```json
"DocumentStorage": {
  "Provider": "Local", // or "InMemory"
  "RootPath": "Storage/Documents"
},
"MetadataStore": {
  "FilePath": "Storage/documents.json"
}
```

* `Provider` – `Local` saves files below `RootPath`. `InMemory` keeps files ephemeral in process.
* `FilePath` – location of the JSON file that persists document metadata.

## Response contracts

### `DocumentItem`

Field | Description
----- | -----------
`id` | Stable identifier for the document.
`name` | Friendly display name (defaults to the uploaded file name without extension).
`fileName` | Original uploaded file name.
`mimeType` | MIME type reported by the client.
`type` | Convenience shorthand used by the UI (usually the file extension or MIME subtype).
`size` | File size in bytes.
`createdAt` | UTC timestamp when the document was uploaded.
`createdBy` | Optional friendly name of the actor that uploaded the document.
`downloadUrl` | Absolute URL that returns the document bytes.
`url` | Alias maintained for the existing frontend client; equals `downloadUrl`.
`previewUrl` | Currently matches `downloadUrl`, reserved for future preview endpoints.

### `DocumentListResponse`

```json
{
  "items": [ /* array of DocumentItem */ ]
}
```

### `DocumentUploadResponse`

```json
{
  "document": { /* DocumentItem */ }
}
```

## Endpoints

Method | Route | Description | Authorization
------ | ----- | ----------- | -------------
GET | `/api/documents` | List or search for documents (`search` query optional) | `DocumentReaderPolicy`
GET | `/api/documents/{id}` | Retrieve a single document metadata item | `DocumentReaderPolicy`
GET | `/api/documents/{id}/content` | Download the document bytes | `DocumentReaderPolicy`
POST | `/api/documents/upload` | Upload a document (multipart/form-data) | `DocumentEditorPolicy`
DELETE | `/api/documents/{id}` | Delete a stored document | `DocumentEditorPolicy`
