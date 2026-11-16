// Phase 48: Delegating backward-compatible wrapper around src/lib/file-storage.ts
export {
  type InsertFileUploadJobInput,
  type FileUploadPayloadRow,
  insertFileUploadJob,
  readFileUploadPayload,
} from './file-storage'
