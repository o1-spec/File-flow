import { PDFDocument } from "pdf-lib";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Send } from "../utils/s3WithTimeout.js";
import { streamToBuffer } from "../utils/streamToBuffer.js";

export async function processPdf(upload, uploadId) {
  const rawObject = await s3Send(
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: upload.raw_key,
    })
  );

  const rawBuffer = await streamToBuffer(rawObject.Body);

  const pdfDoc = await PDFDocument.load(rawBuffer, {
    ignoreEncryption: true,
  });

  const pageCount = pdfDoc.getPageCount();

  pdfDoc.setProducer("FileFlow Processor v1");
  pdfDoc.setCreationDate(new Date());
  pdfDoc.setModificationDate(new Date());

  const processedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  const processedKey = `processed/${uploadId}/output.pdf`;

  await s3Send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: processedKey,
      Body: Buffer.from(processedBytes),
      ContentType: "application/pdf",
      Metadata: { "x-page-count": String(pageCount) },
    })
  );

  return {
    processedKey,
    outputMimeType: "application/pdf",
    pageCount,
  };
}
