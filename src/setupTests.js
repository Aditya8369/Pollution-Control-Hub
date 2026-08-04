import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options) => {
      const translations = {
        "footer.brandTitle": "Pollution Control Hub",
        "footer.github": "GitHub Repository",
        "footer.reportIssue": "Report an Issue",
        "footer.contributing": "Contributing Guide",
        "footer.copyright": `© ${options?.year || new Date().getFullYear()} Pollution Control Hub.`,
      };
      return translations[key] || key;
    },
    i18n: {
      changeLanguage: () => new Promise(() => {}),
      language: "en",
    },
  }),
}));