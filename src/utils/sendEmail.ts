import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { AWS_ACCESS_KEY_ID, AWS_REGION, AWS_SECRET_ACCESS_KEY } from "../config.js";

interface SendEmailParams {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlBody: string;
  from: string;
  replyTo?: string[];
}

/**
 * Send an HTML email using AWS SES v3
 */
export async function sendEmail(params: SendEmailParams): Promise<string> {
  // Create SES client
  const sesClient = new SESClient({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });

  // Create the email command
  const command = new SendEmailCommand({
    Source: params.from,
    Destination: {
      ToAddresses: params.to,
      CcAddresses: params.cc,
      BccAddresses: params.bcc,
    },
    Message: {
      Subject: {
        Data: params.subject,
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: params.htmlBody,
          Charset: "UTF-8",
        },
      },
    },
    ReplyToAddresses: params.replyTo,
  });

  try {
    const result = await sesClient.send(command);
    console.log("Email sent successfully:", result.MessageId);
    return result.MessageId!;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}
