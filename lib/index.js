/**
 * @ttxl314/dsh-ds-peak-valley — host loader entry.
 *
 * The plugin is browser-only: the client bundle (lib/client.js) renders the
 * persistent 文峰/文谷 badge in the conversation composer dock. This host
 * face is a no-op that exists only so the package remains a loader entry —
 * dsh-client-modules scans loader entries for the dsh.client declaration and
 * serves the client bundle from it.
 *
 * Peak/valley schedule (Beijing time):
 *   - 文峰 (peak):   Mon-Fri 09:00-12:00 and 14:00-18:00
 *   - 文谷 (valley): every other moment
 * https://api-docs.deepseek.com/zh-cn/quick_start/pricing/
 */
export function apply() {}
