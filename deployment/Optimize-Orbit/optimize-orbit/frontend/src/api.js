const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

/**
 * Get auth token from shared cookie (set by Auth Service)
 */
function getAuthHeaders() {
  const token = getCookie("orbit_token");
  const headers = { "Content-Type": "application/json" };
  const orgId = getCookie("orbit_org_id");
  const brandId = getCookie("orbit_brand_id");
  const projectId = getCookie("orbit_project_id");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (orgId) headers["X-Orbita-Org-Id"] = orgId;
  if (brandId) headers["X-Orbita-Brand-Id"] = brandId;
  if (projectId) headers["X-Orbita-Project-Id"] = projectId;
  return headers;
}
export async function analyzeText({ content, target_keyword, content_type, author_name }) {
  const res = await fetch(`${BASE}/analyze`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      content, target_keyword, content_type, author_name,
      // Include platform context if available
      organization_id: getCookie("orbit_org_id"),
      brand_id: getCookie("orbit_brand_id"),
      project_id: getCookie("orbit_project_id"),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server error ${res.status}`);
  }
  return res.json();
}

export async function analyzeUrl({ url, target_keyword, content_type }) {
  const res = await fetch(`${BASE}/analyze/url`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      url, target_keyword, content_type,
      organization_id: getCookie("orbit_org_id"),
      brand_id: getCookie("orbit_brand_id"),
      project_id: getCookie("orbit_project_id"),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server error ${res.status}`);
  }
  return res.json();
}

export async function analyzeFile({ file, target_keyword, content_type }) {
  const form = new FormData();
  form.append("file", file);
  form.append("target_keyword", target_keyword);
  form.append("content_type", content_type);
  const orgId = getCookie("orbit_org_id");
  const brandId = getCookie("orbit_brand_id");
  const projectId = getCookie("orbit_project_id");
  if (orgId) form.append("organization_id", orgId);
  if (brandId) form.append("brand_id", brandId);
  if (projectId) form.append("project_id", projectId);

  const token = getCookie("orbit_token");
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}/analyze/file`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server error ${res.status}`);
  }
  return res.json();
}
