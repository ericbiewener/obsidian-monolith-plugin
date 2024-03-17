import os from "os";
import path from "path";
import chalk from "chalk";
import fse from "fs-extra";
import TerserPlugin from "terser-webpack-plugin";
import { Compiler, Configuration } from "webpack";
import { assert } from "./src/utils/assert";

const isProd = process.env.NODE_ENV === "production";

const paths = {
	pluginSrc: path.join(__dirname, "src/plugins"),
	vaults: {
		personal: path.join(os.homedir(), "Sync/Personal Notes"),
		test: path.join(os.homedir(), "Repos/Personal/obsidian-vault-testing"),
		private: path.join(os.homedir(), "Repos/Personal/personal-notes-private"),
		work: path.join(
			os.homedir(),
			"Library/CloudStorage/OneDrive-WalmartInc/Notes",
		),
	},
};

const plugins = [
	"grab-bag",
	"jump",
	"lock-screen",
	"templater",
	"omni-switcher",
	"enable-plugins-after-startup",
	"protect-note",
] as const;

type Plugin = (typeof plugins)[number];
type Env = Partial<Record<Plugin, boolean>>;

const getPlugin = async (env: Env) => {
	const plugin = plugins.find((p) => env[p]);
	assert(plugin);
	return plugin;
};

export default async (env: Env): Promise<Configuration> => {
	const plugin = await getPlugin(env);
	const src = path.join(paths.pluginSrc, plugin);
	const dist = path.join(__dirname, "dist", plugin);

	return {
		target: "node",
		mode: "none",
		entry: path.join(src, "index.ts"),
		output: {
			path: dist,
			libraryTarget: "commonjs2",
		},
		externals: {
			electron: "commonjs2 electron",
			obsidian: "commonjs2 obsidian",
		},
		resolve: {
			extensions: [".ts", ".js"],
		},
		module: {
			rules: [
				{
					test: /\.ts$/,
					exclude: /node_modules/,
					use: [
						{
							loader: "ts-loader",
						},
					],
				},
				{
					test: /\.module\.css$/,
					use: [
						"style-loader",
						{
							loader: "css-loader",
							options: {
								modules: true,
							},
						},
					],
				},
				{
					test: /\.css$/,
					exclude: /\.module\.css$/,
					use: [
						"style-loader",
						{
							loader: "css-loader",
						},
					],
				},
			],
		},
		plugins: [
			{
				apply: (compiler: Compiler) => {
					compiler.hooks.afterEmit.tap(
						"AfterEmitPlugin",
						postBuild(plugin, src, dist),
					);
				},
			},
		],
		devtool: isProd ? false : "source-map",
		optimization: {
			minimize: isProd,
			minimizer: isProd
				? [
						new TerserPlugin({
							extractComments: false,
							minify: TerserPlugin.uglifyJsMinify,
							terserOptions: {},
						}),
				  ]
				: [],
		},
	};
};

const MANIFEST_FILE = "manifest.json";
const allVaults = [
	paths.vaults.personal,
	paths.vaults.private,
	paths.vaults.work,
];

const pluginToVault: Record<Plugin, string[]> = {
	"lock-screen": [paths.vaults.personal],
	"grab-bag": allVaults,
	"omni-switcher": allVaults,
	jump: [paths.vaults.work],
	templater: [paths.vaults.work],
	"enable-plugins-after-startup": allVaults,
	"protect-note": [paths.vaults.personal],
};

const postBuild = (plugin: Plugin, src: string, dist: string) => async () => {
	await fse.copyFile(
		path.join(src, MANIFEST_FILE),
		path.join(dist, MANIFEST_FILE),
	);

	const vaultPaths = pluginToVault[plugin];
	for (const dir of vaultPaths) {
		await fse.copy(dist, path.join(dir, ".obsidian/plugins", plugin));
	}

	console.info(
		chalk.green(`\n✅ Copied plugin ${chalk.cyan(plugin)} to vaults.`),
	);
	console.info(vaultPaths.join("\n"));
};
