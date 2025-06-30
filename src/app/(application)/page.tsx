import clerk from "@clerk/clerk-sdk-node";
import { auth } from "@clerk/nextjs/server";
import { google } from "googleapis";

export default async function Home() {
  const fetchMessages = async () => {
    const token = await getToken();
    const gmail = google.gmail({
      version: "v1",
      headers: { Authorization: `Bearer ${token}` },
    });

    const res = await gmail.users.messages.list({
      userId: "me",
      maxResults: 5,
      prettyPrint: true,
    });

    return res.data.messages || [];
  };

  const fetchMessageDetails = async (messageId: string) => {
    const token = await getToken();
    const gmail = google.gmail({
      version: "v1",
      headers: { Authorization: `Bearer ${token}` },
    });

    const res = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
    });

    return res.data;
  };

  const messages = await fetchMessages();
  if (!messages.length) {
    return <p>No messages found.</p>;
  }
  const messageDetails = await Promise.all(
    messages.map((message) => fetchMessageDetails(message.id!))
  );

  return (
    <pre>
      {JSON.stringify(
        {
          parts: messageDetails.map((message) => ({
            ...message,
            payload: {
              ...message.payload,
              parts: message.payload?.parts?.map((part) => ({
                ...part,
                body: decodeBase64url(part.body!.data!),
              })),
            },
          })),
        },
        null,
        2
      )}
    </pre>
  );
}

async function getToken() {
  try {
    const { userId } = await auth();

    // this returns an array of OauthAccessToken objects I'm just getting the first one
    const [OauthAccessToken] = await clerk.users.getUserOauthAccessToken(
      userId || "",
      "oauth_google"
    );

    // this is the token I need to use to make requests to the gmail api
    // destructuring it here for clarity you can also just use OauthAccessToken.token below
    const { token } = OauthAccessToken;

    if (!token) {
      throw new Error("Unauthorized NO TOKEN");
    }

    return token;
  } catch (error) {
    console.error("[GMAIL ERROR]", error);
  }
}

function decodeBase64url(str: string) {
  const normalized = str.replace(/-/g, "+").replace(/_/g, "/");
  const buffer = Buffer.from(normalized, "base64");
  return buffer.toString("utf-8");
}
