import os
import requests
from mcp.server import Server, stdio_server
from mcp.types import Tool, TextContent

app = Server("jindai-search")

@app.list_tools()
async def list_tools():
    return [Tool(name="jindai", description="搜索 Jindai 文献利用平台", inputSchema={"type":"object","properties":{"query":{"type":"string"}}})]

@app.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "jindai":
        query = arguments["query"]
        url = os.environ["JINDAI_API_URL"]
        headers = {"Authorization": f"Bearer {os.environ['JINDAI_API_KEY']}"}
        response = requests.post(url, json={"q": query}, headers=headers)
        return [TextContent(type="text", text=response.text)]

if __name__ == "__main__":
    stdio_server.run(app)