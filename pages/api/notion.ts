import type { NextApiRequest, NextApiResponse } from "next";
import Cors from "cors";

// Initializing the cors middleware
const cors = Cors({
  methods: ["GET", "HEAD"],
});

// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }

      return resolve(result);
    });
  });
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  await runMiddleware(req, res, cors);

  const { id, secret } = req.query;

  if (!secret && !process.env.NOTION_API_KEY) {
    res.status(401).json({ error: "No secret provided" });
    return;
  }

  const data = await fetch(`https://api.notion.com/v1/databases/${id}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret ? secret : process.env.NOTION_API_KEY}`,
      "Notion-Version": "2022-02-22",
    },
  }).then((res) => res.json());

  if (data?.object === "error") {
    res.status(401).json({ error: data.message });
    return;
  }

  const database = data.results?.filter((d: any) => d.properties.Content.title.length > 0)
    .map((d: any) => ({
      title: d.properties.Title.rich_text[0].plain_text,
      content: d.properties.Content.title
        .map((t: any) => t.plain_text)
        .join(" "),
      category: d.properties.Category.multi_select[0]?.name,
    }));

  return res.json({ response: database });
};

export default handler;
