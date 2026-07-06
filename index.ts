/**
 * @typedef {Object} Env
 */

export default {
	/** 
	 * @param {Request} request
	 * @param {Env} env
	 * @param {ExecutionContext} ctx
	 * @returns {Promise<Response>}
	 */
	async fetch(request) {
		const url = new URL(request.url);
		const response = await fetch(`http://gitignore.io/api/${url.pathname}`);
		const text = await response.text();
		return new Response(text);
	},
};
