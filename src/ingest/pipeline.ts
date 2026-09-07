export interface IngestedContent {
  contentId: string;
  sourceType: 'FILE_UPLOAD' | 'IMAGE_UPLOAD' | 'TEXT_PASTE' | 'MOBILE_SYNC';
  filename?: string;
  mimeType?: string;
  sizeBytes: number;
  rawContent: string;
  trustClassification: 'UNTRUSTED_EXTERNAL_DATA';
  provenance: {
    uploaderId: string;
    timestamp: number;
    checksum: string;
  };
  hasSecurityWarning: boolean;
}

export class ContentIngestionPipeline {
  public async ingest(
    rawContent: string,
    sourceType: IngestedContent['sourceType'],
    filename?: string,
    uploaderId = 'desktop_user'
  ): Promise<IngestedContent> {
    const contentId = `ingest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const sizeBytes = new Blob([rawContent]).size;

    // Security Directive: Untrusted content check for prompt injection or system commands
    const lower = rawContent.toLowerCase();
    const hasSecurityWarning =
      lower.includes('ignore all previous instructions') ||
      lower.includes('system admin') ||
      lower.includes('grant permission') ||
      lower.includes('rm -rf');

    return {
      contentId,
      sourceType,
      filename,
      sizeBytes,
      rawContent,
      trustClassification: 'UNTRUSTED_EXTERNAL_DATA',
      provenance: {
        uploaderId,
        timestamp: Date.now(),
        checksum: `sha256_${Date.now()}`,
      },
      hasSecurityWarning,
    };
  }
}

export const contentIngestionPipeline = new ContentIngestionPipeline();
