/**
 * Stands in for Microsoft Graph at the network boundary only. Responses are
 * shaped like the examples in the Graph docs for
 * GET /v1.0/sites/{siteId}/lists/{listId}/items?expand=fields (paged with
 * @odata.nextLink) and PATCH .../items/{itemId}/fields.
 *
 * The application code that talks to this is the same code that would talk to
 * a real tenant; only GRAPH_BASE_URL and GRAPH_TOKEN_URL change.
 */
import http from "node:http";

const PORT = Number(process.env.GRAPH_MOCK_PORT ?? 8095);

type Item = { id: string; fields: Record<string, unknown> };

const items: Item[] = [
  {
    id: "1",
    fields: {
      CustomerName: "Ada Whitfield",
      Amount: 1200,
      ExceptionReason: "Chargeback disputed by issuer",
      RequestedBy: "sam@fintech.example",
      Status: "Open",
      CustomerIBAN: "GB29NWBK60161331926819",
    },
  },
  {
    id: "2",
    fields: {
      CustomerName: "Bruno Salas",
      Amount: 240,
      ExceptionReason: "Refund sent to closed account",
      RequestedBy: "sam@fintech.example",
      Status: "Open",
      CustomerIBAN: "GB33BUKB20201555555555",
    },
  },
  {
    id: "3",
    fields: {
      CustomerName: "Chen Wei",
      Amount: 640,
      ExceptionReason: "Partial refund requested by support",
      RequestedBy: "maria@fintech.example",
      Status: "Open",
      CustomerIBAN: "GB94BARC10201530093459",
    },
  },
];

function json(res: http.ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(payload);
}

export function createServer(): http.Server {
  return http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? `localhost:${PORT}`}`);

    if (req.method === "POST" && url.pathname === "/token") {
      return json(res, 200, {
        token_type: "Bearer",
        expires_in: 3599,
        access_token: "mock-graph-access-token",
      });
    }

    // Paged list read. Page 1 returns two items plus @odata.nextLink.
    const listMatch = url.pathname.match(/^\/v1\.0\/sites\/[^/]+\/lists\/[^/]+\/items$/);
    if (req.method === "GET" && listMatch) {
      const page = url.searchParams.get("page");
      if (page === "2") {
        return json(res, 200, { value: items.slice(2) });
      }
      const next = new URL(url.toString());
      next.searchParams.set("page", "2");
      return json(res, 200, {
        value: items.slice(0, 2),
        "@odata.nextLink": next.toString(),
      });
    }

    const patchMatch = url.pathname.match(
      /^\/v1\.0\/sites\/[^/]+\/lists\/[^/]+\/items\/([^/]+)\/fields$/,
    );
    if (req.method === "PATCH" && patchMatch) {
      const item = items.find((i) => i.id === patchMatch[1]);
      if (!item) return json(res, 404, { error: { code: "itemNotFound" } });
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        Object.assign(item.fields, JSON.parse(body || "{}"));
        json(res, 200, item.fields);
      });
      return;
    }

    json(res, 404, { error: { code: "unknownEndpoint", message: url.pathname } });
  });
}

if (process.argv[1]?.includes("graph-mock")) {
  createServer().listen(PORT, () => {
    console.log(`Mock Microsoft Graph listening on http://localhost:${PORT}`);
  });
}
