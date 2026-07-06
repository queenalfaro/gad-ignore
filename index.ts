async function get(url: string): Promise<Response> {
	try {
		return await fetch(url);
	} catch (error) {
		return new Response(`Error fetching upstream: ${error.message}`, {
			status: 502
		});
	}
}

function findTemplateLink(target: string, text: string): string {
	const cleanTarget = target.trim().toLowerCase();
	const locRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/gi;
	let match;
	const matches: string[] = [];

	while ((match = locRegex.exec(text)) !== null) {
		const url = match[1];
		const lastSegment = url.split('/').pop() || '';

		if (lastSegment.toLowerCase().includes(cleanTarget)) {
			matches.push(url);

			if (matches.length > 1) {
				throw new Error(`Ambiguous template name '${target}': multiple matches found in sitemap.`);
			}
		}
	}

	if (matches.length === 1) {
		return matches[0];
	}

	throw new Error(`Template '${target}' not found in sitemap.`);
}

async function extractTemplateText(link: string | undefined): Promise<string> {
	if (!link) {
		throw new Error("Cannot extract template: link is undefined.");
	}

	const response = await get(link);
	if (!response.ok) {
		throw new Error(`Failed to fetch template from ${link}: HTTP ${response.status} ${response.statusText}`);
	}

	let accumulatedText = '';

	const rewriter = new HTMLRewriter().on('code.language-dockerignore', {
		text(chunk) {
			accumulatedText += chunk.text;
		}
	});

	await rewriter.transform(response).text();

	const trimmedText = accumulatedText.trim();
	if (!trimmedText) {
		throw new Error(`Template content is empty or element 'code.language-dockerignore' was not found at ${link}`);
	}

	return trimmedText;
}


async function fetchWorker(request: Request): Promise<Response> {

	const url = new URL(request.url);

	const hostParts = url.hostname.split('.');
	const subdomain = hostParts.length > 2 ? hostParts[0].toLowerCase() : '';

	const isG = ['g', 'gi', 'git', 'gitignore'].includes(subdomain);
	const isD = ['d', 'di', 'docker', 'dockerignore'].includes(subdomain);

	if (isG && isD || !isG && !isD) {
		return new Response("ERROR: Couldn't determine the type (G/D).", {
			status: 400,
		});
	}

	const cleanPath = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;

	if (!cleanPath) {
		return new Response("Please append your requested templates to the URL path (e.g., /node,python).", {
			status: 400,
		});
	}

	if (isG) {
		return await get(`https://gitignore.io/api/${cleanPath}${url.search}`);
	}

	if (isD) {
		const sitemapRawData = await get(`https://dockerignore.com/storage/sitemap-dockerignores-0.xml`);
		const sitemapText = await sitemapRawData.text();

		const targetWords = cleanPath.split(',').map(t => t.trim().toLowerCase());

		const links = targetWords
			.map(targetWord => findTemplateLink(targetWord, sitemapText))
			.filter(Boolean);

		const templatePromises = links.map(link => extractTemplateText(link));
		const templates = await Promise.all(templatePromises);
		const templatesText = templates.join('\n');

		return new Response(templatesText);
	}

	return Response.json({ status: "ok" });
}

export default {
	async fetch(request: Request): Promise<Response> {
		try {
			return await fetchWorker(request);
		} catch (error: any) {
			return new Response(`Error: ${error.message}`, {
				status: 502,
			});
		}
	},
};
