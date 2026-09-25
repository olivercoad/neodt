import packageJson from "../../package.json";
import { currentFramework, frameworks, type FrameworkId } from "../framework";
import { libraries, type LibraryId } from "../libraries";
import { useLibrary } from "../library";
import type { CodeLanguage } from "./highlight";

import styles from "./code.module.css";

export interface ExampleProps {
  value: string;
  language: CodeLanguage;
  title?: string;
  framework?: FrameworkId;
  library?: LibraryId;
  details?: Record<string, unknown>;
}

export default function ReportIssue(props: ExampleProps) {
  const selectedLibrary = useLibrary();
  const issueUrl = () => {
    const framework = frameworks.find(({ id }) => id === props.framework) ?? currentFramework();
    const library = libraries.find(({ id }) => id === props.library) ?? selectedLibrary;
    // Keep even reader-edited code containing Markdown fences inside its code block.
    const fence = "`".repeat(
      (props.value.match(/`+/g) ?? []).reduce((length, run) => Math.max(length, run.length + 1), 3),
    );
    const body = [
      "## What is wrong?",
      "Please describe the problem, what you expected to happen, and how to reproduce it. Include any error messages.",
      "",
      "## Example context",
      `- Example: ${props.title ?? document.title}`,
      `- Framework: ${framework.label} (${framework.id})`,
      `- Datetime library: ${library.label} (${library.id})`,
      `- neodt version: ${packageJson.version}`,
      `- Page: ${window.location.href}`,
      `- Browser: ${navigator.userAgent}`,
      ...(props.details
        ? Object.entries(props.details).map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
        : []),
      "",
      "## Code example",
      `${fence}${props.language}`,
      props.value,
      fence,
    ].join("\n");
    const url = new URL(`${packageJson.bugs.url}/new`);
    url.search = new URLSearchParams({
      title: `Code example: ${props.title ?? framework.label} (${library.label})`,
      body,
      labels: "code example",
    }).toString();
    return url.href;
  };
  return (
    <a
      data-report-issue
      class={styles.reportIssue}
      href={issueUrl()}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => {
        event.currentTarget.href = issueUrl();
      }}
    >
      Report Issue
    </a>
  );
}
