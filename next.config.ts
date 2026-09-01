import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * Next regenerates AGENTS.md and CLAUDE.md on every dev start, and its
   * boilerplate contains em-dashes. Constraint one of the build prompt is that
   * a repository wide search for an em-dash returns nothing, so the generator
   * is off rather than fighting it on every run.
   */
  agentRules: false,
};

export default nextConfig;
