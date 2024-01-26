import type { GitData } from "@vuepress/plugin-git";
import type { App, Page } from "vuepress/core";
import { colors, fs, path } from "vuepress/utils";
import { entries, fromEntries } from "vuepress-shared/node";

import { FeedItem } from "./feedItem.js";
import { FeedStore } from "./feedStore.js";
import { getAtomFeed } from "./generator/atom/index.js";
import { getJSONFeed } from "./generator/json/index.js";
import { getRssFeed } from "./generator/rss/index.js";
import type { ResolvedFeedOptionsMap } from "./options.js";
import { getFilename } from "./options.js";
import type { FeedPluginFrontmatter } from "./typings/index.js";
import { logger } from "./utils/index.js";

export const outputAtomTemplates = (
  app: App,
  options: ResolvedFeedOptionsMap,
): Promise<void>[] =>
  entries(options)
    // filter enabled locales
    .filter(([, { atom }]) => atom)
    // write template
    .map(([localePath, localeOptions]) => {
      const { atomXslTemplate, atomXslFilename } = getFilename(
        localeOptions,
        localePath,
      );

      return fs.copyFile(atomXslTemplate, app.dir.dest(atomXslFilename));
    });

export const outputRSSTemplates = (
  app: App,
  options: ResolvedFeedOptionsMap,
): Promise<void>[] =>
  entries(options)
    // filter enabled locales
    .filter(([, { rss }]) => rss)
    // write template
    .map(([localePath, localeOptions]) => {
      const { rssXslFilename, rssXslTemplate } = getFilename(
        localeOptions,
        localePath,
      );

      return fs.copyFile(rssXslTemplate, app.dir.dest(rssXslFilename));
    });

export const outputFeedFiles = (
  app: App,
  options: ResolvedFeedOptionsMap,
): Promise<void>[] => {
  const { dest } = app.dir;
  const localMap: Record<string, FeedStore> = fromEntries(
    entries(options).map(([localePath, localeOptions]) => [
      localePath,
      new FeedStore(app, localeOptions, localePath),
    ]),
  );

  return (
    entries(options)
      // filter enabled locales
      .filter(([, { atom, json, rss }]) => atom || json || rss)
      .map(async ([localePath, localeOptions]) => {
        const {
          atom,
          json,
          rss,
          count: feedCount = 100,
          filter,
          sorter,
        } = localeOptions;

        const feedStore = localMap[localePath];
        const pages = app.pages
          .filter((page) => page.pathLocale === localePath)
          .filter(filter)
          .sort(sorter);

        // add feed items
        for (const page of pages) {
          const feedItem = new FeedItem(
            app,
            localeOptions,
            <Page<{ git?: GitData }, FeedPluginFrontmatter>>page,
          );

          feedStore.add(feedItem);
          if (feedStore.items.length === feedCount) break;
        }

        const count = feedStore.items.length;

        logger.succeed(
          `added ${colors.cyan(
            `${count} page${count > 1 ? "s" : ""}`,
          )} as feed item${count > 1 ? "s" : ""} in route ${colors.cyan(
            localePath,
          )}`,
        );

        const { atomOutputFilename, jsonOutputFilename, rssOutputFilename } =
          getFilename(localeOptions, localePath);

        const outputFeed = async (
          name: string,
          filename: string,
          generator: (feedStore: FeedStore) => string,
        ): Promise<void> => {
          await fs.ensureDir(path.dirname(dest(filename)));
          await fs.outputFile(dest(filename), generator(feedStore));

          logger.succeed(
            `Generated ${name} feed file to ${colors.cyan(filename)}`,
          );
        };

        // generate feed
        await Promise.all([
          atom ? outputFeed(atomOutputFilename, "Atom", getAtomFeed) : null,
          json ? outputFeed(jsonOutputFilename, "JSON", getJSONFeed) : null,
          rss ? outputFeed(rssOutputFilename, "RSS", getRssFeed) : null,
        ]);
      })
  );
};