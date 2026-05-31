/** Shared stack name → Font Awesome icon mapping. */
const STACK_ICON_MAP = {
  Python: "fab fa-python",
  React: "fab fa-react",
  "React Native": "fab fa-react",
  FastAPI: "fas fa-bolt",
  JavaScript: "fab fa-js",
  TypeScript: "fab fa-js-square",
  Java: "fab fa-java",
  "C++": "fas fa-code",
  "C#": "fas fa-code",
  Go: "fab fa-golang",
  Rust: "fas fa-cog",
  Docker: "fab fa-docker",
  Kubernetes: "fab fa-docker",
  PostgreSQL: "fas fa-database",
  MySQL: "fas fa-database",
  MongoDB: "fas fa-leaf",
  Redis: "fas fa-database",
  Git: "fab fa-git-alt",
  Linux: "fab fa-linux",
  AWS: "fab fa-aws",
  Azure: "fab fa-microsoft",
  Figma: "fab fa-figma",
  HTML: "fab fa-html5",
  CSS: "fab fa-css3-alt",
  Vue: "fab fa-vuejs",
  Angular: "fab fa-angular",
  Node: "fab fa-node-js",
  PHP: "fab fa-php",
  Swift: "fab fa-swift",
  Kotlin: "fab fa-android",
  Flutter: "fas fa-mobile-alt",
  TensorFlow: "fas fa-brain",
  PyTorch: "fas fa-brain",
  SQL: "fas fa-database",
  GraphQL: "fas fa-project-diagram",
  Elasticsearch: "fas fa-search",
};

const DEFAULT_STACK_ICON = "fas fa-layer-group";

const ALL_STACK_NAMES = Object.keys(STACK_ICON_MAP).sort((a, b) => a.localeCompare(b, "ru"));

function getStackIconClass(stackName) {
  return STACK_ICON_MAP[stackName] || DEFAULT_STACK_ICON;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderStackTag(stackName) {
  const icon = getStackIconClass(stackName);
  return `<span class="stack-tag"><i class="${icon}"></i>${escapeHtml(stackName)}</span>`;
}

function renderStackTags(stacks) {
  if (!stacks?.length) {
    return '<span class="projects-muted">Не указан</span>';
  }
  return stacks.map((name) => renderStackTag(name)).join("");
}

window.StackIcons = {
  STACK_ICON_MAP,
  ALL_STACK_NAMES,
  getStackIconClass,
  renderStackTag,
  renderStackTags,
  escapeHtml,
};
