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
  "AI Engineer": "fas fa-robot",
  "Algorithmic Programming": "fas fa-code-branch",
  "Applied Informatics": "fas fa-laptop-code",
  "Business / Legal / Documentation": "fas fa-file-contract",
  "Business Analyst": "fas fa-chart-pie",
  "C# Backend": "fas fa-code",
  "Communication / Soft Skills": "fas fa-comments",
  "Computer Vision Engineer": "fas fa-eye",
  "Cybersecurity Specialist": "fas fa-shield-alt",
  "Data Analyst": "fas fa-chart-line",
  "Data Engineer": "fas fa-database",
  "Data Scientist": "fas fa-brain",
  "Database Engineer / DBA": "fas fa-database",
  "DevOps / Cloud Engineer": "fas fa-cloud",
  "Embedded / Hardware Engineer": "fas fa-microchip",
  Frontend: "fas fa-window-maximize",
  "Fullstack Web Development": "fas fa-layer-group",
  "Game Development": "fas fa-gamepad",
  "General IT / Foundational Skills": "fas fa-graduation-cap",
  "Java Backend": "fab fa-java",
  "ML Engineer": "fas fa-brain",
  "Mathematics / Applied Math": "fas fa-square-root-alt",
  "Mobile Development": "fas fa-mobile-alt",
  "Multimedia Systems Engineer": "fas fa-photo-video",
  "NLP / LLM Engineer": "fas fa-language",
  "Network Engineer": "fas fa-network-wired",
  "Product Manager": "fas fa-tasks",
  "Project Manager": "fas fa-project-diagram",
  "Python Backend": "fab fa-python",
  "QA Engineer": "fas fa-vial",
  "Research / Academic Track": "fas fa-flask",
  "Robotics / IoT Engineer": "fas fa-satellite-dish",
  "Secure Software Engineer": "fas fa-lock",
  "Software Engineering": "fas fa-code",
  "System Administrator": "fas fa-server",
  "System Analyst": "fas fa-sitemap",
  "Team Lead": "fas fa-users-cog",
  "Telecom / Radio Engineer": "fas fa-broadcast-tower",
  "Test Automation Engineer": "fas fa-clipboard-check",
  "UX/UI Design": "fas fa-pencil-ruler",
};

const DEFAULT_STACK_ICON = "fas fa-layer-group";

const SPECIALIZATION_TAG_NAMES = [
  "AI Engineer",
  "Algorithmic Programming",
  "Applied Informatics",
  "Business / Legal / Documentation",
  "Business Analyst",
  "C# Backend",
  "Communication / Soft Skills",
  "Computer Vision Engineer",
  "Cybersecurity Specialist",
  "Data Analyst",
  "Data Engineer",
  "Data Scientist",
  "Database Engineer / DBA",
  "DevOps / Cloud Engineer",
  "Embedded / Hardware Engineer",
  "Frontend",
  "Fullstack Web Development",
  "Game Development",
  "General IT / Foundational Skills",
  "Java Backend",
  "ML Engineer",
  "Mathematics / Applied Math",
  "Mobile Development",
  "Multimedia Systems Engineer",
  "NLP / LLM Engineer",
  "Network Engineer",
  "Product Manager",
  "Project Manager",
  "Python Backend",
  "QA Engineer",
  "Research / Academic Track",
  "Robotics / IoT Engineer",
  "Secure Software Engineer",
  "Software Engineering",
  "System Administrator",
  "System Analyst",
  "Team Lead",
  "Telecom / Radio Engineer",
  "Test Automation Engineer",
  "UX/UI Design",
].sort((a, b) => a.localeCompare(b, "ru"));

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
  SPECIALIZATION_TAG_NAMES,
  getStackIconClass,
  renderStackTag,
  renderStackTags,
  escapeHtml,
};
