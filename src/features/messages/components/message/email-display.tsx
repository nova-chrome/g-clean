"use client";

import { useMemo } from "react";

interface EmailIframeProps {
  body: string;
}

export function EmailDisplay({ body }: EmailIframeProps) {
  // Clean and process the email body
  const processedBody = useMemo(() => {
    // Check if the body contains HTML tags
    const hasHtml = /<[^>]+>/.test(body);

    if (!hasHtml) {
      // If it's plain text, convert line breaks to HTML
      return body.replace(/\n/g, "<br>");
    }

    // If it contains HTML, try to extract just the HTML part
    // Many emails have plain text followed by HTML content
    const htmlMatch = body.match(
      /<!DOCTYPE html[\s\S]*<\/html>|<html[\s\S]*<\/html>/i
    );

    if (htmlMatch) {
      return htmlMatch[0];
    }

    // Look for content that starts with HTML tags
    const htmlStartMatch = body.match(/<(?:div|table|body|html)[\s\S]*$/i);

    if (htmlStartMatch) {
      return htmlStartMatch[0];
    }

    // If we can't find clean HTML, but there are HTML tags, clean it up
    if (hasHtml) {
      // Remove excessive whitespace and line breaks before HTML content
      return body.replace(/^[\s\r\n]*(?=<)/gm, "");
    }

    return body;
  }, [body]);

  if (!processedBody) {
    return <p className="text-muted-foreground">No content available</p>;
  }

  return (
    <div className="relative">
      <iframe
        srcDoc={`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  margin: 0;
                  padding: 20px;
                  background: white;
                  word-wrap: break-word;
                  overflow-wrap: break-word;
                }
                /* Reset styles that might conflict */
                * {
                  max-width: 100% !important;
                  box-sizing: border-box;
                }
                img {
                  max-width: 100% !important;
                  height: auto !important;
                  display: block;
                }
                table {
                  width: 100% !important;
                  border-collapse: collapse;
                  table-layout: fixed;
                }
                td, th {
                  word-wrap: break-word;
                  overflow-wrap: break-word;
                }
                /* Prevent fixed positioning that could break layout */
                * {
                  position: static !important;
                }
                /* Hide potential duplicate content */
                .gmail_quote {
                  display: none !important;
                }
                /* Style for plain text emails */
                pre {
                  white-space: pre-wrap;
                  font-family: inherit;
                  margin: 0;
                }
              </style>
            </head>
            <body>
              ${processedBody}
            </body>
          </html>
        `}
        className="w-full border-0 bg-white rounded"
        style={{ minHeight: "200px" }}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        onLoad={(e) => {
          const iframe = e.target as HTMLIFrameElement;
          const doc = iframe.contentDocument;
          if (doc) {
            // Auto-resize iframe to content
            const resizeIframe = () => {
              const height = Math.max(
                doc.body.scrollHeight,
                doc.body.offsetHeight,
                doc.documentElement.scrollHeight,
                doc.documentElement.offsetHeight
              );
              iframe.style.height = Math.max(height, 200) + "px";
            };

            // Wait for images to load before resizing
            const images = doc.images;
            let loadedImages = 0;

            const checkResize = () => {
              loadedImages++;
              if (loadedImages === images.length) {
                resizeIframe();
              }
            };

            if (images.length === 0) {
              resizeIframe();
            } else {
              Array.from(images).forEach((img) => {
                if (img.complete) {
                  checkResize();
                } else {
                  img.onload = checkResize;
                  img.onerror = checkResize;
                }
              });
            }

            // Watch for content changes
            const observer = new MutationObserver(() => {
              setTimeout(resizeIframe, 100);
            });
            observer.observe(doc.body, {
              childList: true,
              subtree: true,
              attributes: true,
            });
          }
        }}
      />
    </div>
  );
}
