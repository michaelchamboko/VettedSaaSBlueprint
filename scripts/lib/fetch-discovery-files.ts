export async function fetchDiscoveryFiles(origin: string): Promise<{ robots: string; sitemap: string }> {
  const [robots, sitemap] = await Promise.all(["robots.txt", "sitemap.xml"].map(async (file) => {
    const response = await fetch(`${origin}/${file}`);
    if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
    return response.text();
  }));
  return { robots, sitemap };
}
