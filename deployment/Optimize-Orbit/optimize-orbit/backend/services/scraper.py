import httpx
from bs4 import BeautifulSoup

# This makes your request looks like a real Browser
# Many websites blocks bots, without this you may get blocked
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/123.0.0.0 Safari/537.36"
    )
}


async def scrape_url(url: str) -> dict:
    if not url.startswith(("http://", "https://")):
        raise ValueError("URL must start with http:// or https://")

    async with httpx.AsyncClient(
        timeout=15.0,
        follow_redirects=True,
        headers=_HEADERS,
    ) as client:
        resp = await client.get(url)
        resp.raise_for_status() # will throw error for 404, 500 etc.

    # lxml is a tree structure
    soup = BeautifulSoup(resp.text, "lxml")

    for tag in soup(["script", "style", "nav", "footer",
                     "header", "aside", "noscript", "iframe"]):
        tag.decompose() # completely removes the tag and content from the tree

    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()

    meta_desc = ""
    meta = soup.find("meta", attrs={"name": "description"})
    if meta:
        meta_desc = meta.get("content", "").strip()

    # Makes content structured,
    # Useful for NLP/ Summarization/ LLMs
    for tag in soup.find_all(["h1", "h2", "h3", "h4"]):
        level  = int(tag.name[1])
        prefix = "#" * level
        tag.replace_with(f"\n{prefix} {tag.get_text(strip=True)}\n")

    raw   = soup.get_text(separator="\n")
    lines = [line.strip() for line in raw.splitlines()]
    lines = [line for line in lines if line]
    content = "\n".join(lines)

    if len(content.split()) < 50:
        raise ValueError(
            "Could not extract enough content from this URL. "
            "The page may require JavaScript or block scrapers."
        )

    return {
        "title":            title,
        "meta_description": meta_desc,
        "content":          content,
        "url":              url,
    }
