//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function() {
	return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let __nodecg_internal_util = require("@nodecg/internal-util");
let __effect_platform_node = require("@effect/platform-node");
let effect = require("effect");
let node_fs = require("node:fs");
node_fs = __toESM(node_fs);
let node_path = require("node:path");
node_path = __toESM(node_path);
let yargs = require("yargs");
let cosmiconfig = require("cosmiconfig");
let klona_json = require("klona/json");
let zod = require("zod");
let node_os = require("node:os");
node_os = __toESM(node_os);
let __sentry_node = require("@sentry/node");
__sentry_node = __toESM(__sentry_node);
let express = require("express");
express = __toESM(express);
let os = require("os");
os = __toESM(os);
let node_crypto = require("node:crypto");
node_crypto = __toESM(node_crypto);
let cookie_parser = require("cookie-parser");
cookie_parser = __toESM(cookie_parser);
let express_session = require("express-session");
express_session = __toESM(express_session);
let passport = require("passport");
passport = __toESM(passport);
let passport_discord = require("passport-discord");
let passport_local = require("passport-local");
let passport_steam = require("passport-steam");
passport_steam = __toESM(passport_steam);
let passport_twitch_helix = require("passport-twitch-helix");
let node_util = require("node:util");
let winston = require("winston");
winston = __toESM(winston);
let __nodecg_database_adapter_sqlite_legacy = require("@nodecg/database-adapter-sqlite-legacy");
let body_parser = require("body-parser");
body_parser = __toESM(body_parser);
let compression = require("compression");
compression = __toESM(compression);
let express_transform_bare_module_specifiers = require("express-transform-bare-module-specifiers");
express_transform_bare_module_specifiers = __toESM(express_transform_bare_module_specifiers);
let fast_memoize = require("fast-memoize");
fast_memoize = __toESM(fast_memoize);
let lodash = require("lodash");
let socket_io = require("socket.io");
socket_io = __toESM(socket_io);
let chokidar = require("chokidar");
chokidar = __toESM(chokidar);
let hasha = require("hasha");
hasha = __toESM(hasha);
let multer = require("multer");
multer = __toESM(multer);
let path = require("path");
path = __toESM(path);
let semver = require("semver");
semver = __toESM(semver);
let events = require("events");
let fp_ts_Either = require("fp-ts/Either");
fp_ts_Either = __toESM(fp_ts_Either);
let fp_ts_function = require("fp-ts/function");
let fp_ts_IOEither = require("fp-ts/IOEither");
fp_ts_IOEither = __toESM(fp_ts_IOEither);
let fp_ts_Option = require("fp-ts/Option");
fp_ts_Option = __toESM(fp_ts_Option);
let extend = require("extend");
extend = __toESM(extend);
let fp_ts_boolean = require("fp-ts/boolean");
fp_ts_boolean = __toESM(fp_ts_boolean);
let fp_ts_IO = require("fp-ts/IO");
fp_ts_IO = __toESM(fp_ts_IO);
let __nodecg_json_schema_defaults = require("@nodecg/json-schema-defaults");
__nodecg_json_schema_defaults = __toESM(__nodecg_json_schema_defaults);
let ajv = require("ajv");
ajv = __toESM(ajv);
let ajv_dist_2019 = require("ajv/dist/2019");
ajv_dist_2019 = __toESM(ajv_dist_2019);
let ajv_dist_2020 = require("ajv/dist/2020");
ajv_dist_2020 = __toESM(ajv_dist_2020);
let ajv_draft_04 = require("ajv-draft-04");
ajv_draft_04 = __toESM(ajv_draft_04);
let ajv_formats = require("ajv-formats");
ajv_formats = __toESM(ajv_formats);
let fs = require("fs");
fs = __toESM(fs);
let git_rev_sync = require("git-rev-sync");
git_rev_sync = __toESM(git_rev_sync);
let cheerio = require("cheerio");
cheerio = __toESM(cheerio);
let serialize_error = require("serialize-error");
let __nodecg_json_schema_lib = require("@nodecg/json-schema-lib");
__nodecg_json_schema_lib = __toESM(__nodecg_json_schema_lib);
let object_path = require("object-path");
object_path = __toESM(object_path);
let json_ptr = require("json-ptr");
let node_events = require("node:events");
let is_error = require("is-error");
is_error = __toESM(is_error);

//#region src/server/_effect/boundary.ts
var UnknownError = class extends effect.Data.TaggedError("UnknownError") {
	constructor(cause) {
		super();
		this.cause = cause;
		this.message = this.cause instanceof Error ? this.cause.message : "An unknown error occurred";
	}
};

//#endregion
//#region src/server/_effect/expect-error.ts
const expectError = () => effect.Function.identity;

//#endregion
//#region src/server/_effect/log-level.ts
const withLogLevelConfig = effect.Effect.fn(function* (effect$1) {
	const logLevel = yield* effect.Config.logLevel("LOG_LEVEL").pipe(effect.Config.withDefault(effect.LogLevel.Info));
	return yield* effect.Logger.withMinimumLogLevel(effect$1, logLevel);
});

//#endregion
//#region src/server/_effect/span-logger.ts
const withSpanProcessorLive = effect.Effect.fn(function* (effect$1) {
	if (!(yield* effect.Config.boolean("LOG_SPAN").pipe(effect.Config.withDefault(false)))) return yield* effect$1;
	const NodeSdk = yield* effect.Effect.promise(() => import("@effect/opentelemetry/NodeSdk"));
	const { SpanStatusCode } = yield* effect.Effect.promise(() => Promise.resolve().then(() => require("./esm-D8HCo8cr.js")));
	const runtime = yield* effect.Effect.runtime();
	const layer = NodeSdk.layer(() => ({
		resource: { serviceName: "nodecg" },
		spanProcessor: {
			forceFlush: () => Promise.resolve(),
			onStart: (span) => {
				effect.Runtime.runSync(runtime, effect.Effect.logTrace(`▶️  ${span.name}`));
			},
			onEnd: (span) => {
				const formattedDuration = (0, effect.pipe)(span.duration, effect.Duration.toMillis, effect.Number.round(0), effect.Duration.millis, effect.Duration.format, effect.String.split(" "), effect.Array.take(2), effect.Array.join(" "));
				let log$7 = `${span.status.code === SpanStatusCode.ERROR ? "❌" : "✅"} ${span.name} (${formattedDuration})`;
				if (span.status.code === SpanStatusCode.ERROR) log$7 += ` ${span.status.message}`;
				effect.Runtime.runSync(runtime, effect.Effect.logTrace(log$7));
			},
			shutdown: () => Promise.resolve()
		}
	}));
	return yield* effect.Effect.provide(effect$1, layer);
});

//#endregion
//#region src/types/logger-interface.ts
const LogLevels = [
	"verbose",
	"debug",
	"info",
	"warn",
	"error",
	"silent"
];
const LogLevel = {
	Trace: "verbose",
	Debug: "debug",
	Info: "info",
	Warn: "warn",
	Error: "error",
	Silent: "silent"
};

//#endregion
//#region src/types/nodecg-config-schema.ts
const parsedArgv = zod.z.object({
	bundlesEnabled: zod.z.string().optional().transform((val) => val?.split(",")),
	bundlesDisabled: zod.z.string().optional().transform((val) => val?.split(",")),
	bundlesPaths: zod.z.string().optional().transform((val) => val?.split(","))
}).parse(yargs.argv);
const nodecgConfigSchema = zod.z.object({
	host: zod.z.string().default("0.0.0.0").describe("The IP address or hostname that NodeCG should bind to."),
	port: zod.z.number().int().positive().default(9090).describe("The port that NodeCG should listen on."),
	baseURL: zod.z.string().optional().describe("The URL of this instance. Used for things like cookies. Defaults to HOST:PORT. If you use a reverse proxy, you'll likely need to set this value."),
	exitOnUncaught: zod.z.boolean().default(true).describe("Whether or not to exit on uncaught exceptions."),
	logging: zod.z.object({
		console: zod.z.object({
			enabled: zod.z.boolean().default(true).describe("Whether to enable console logging."),
			level: zod.z.enum(LogLevels).default("info").describe("The log level to use."),
			timestamps: zod.z.boolean().default(true).describe("Whether to add timestamps to the console logging."),
			replicants: zod.z.boolean().default(false).describe("Whether to enable logging of the Replicants subsystem. Very spammy.")
		}).default({ enabled: true }),
		file: zod.z.object({
			enabled: zod.z.boolean().default(false).describe("Whether to enable file logging."),
			level: zod.z.enum(LogLevels).default("info").describe("The log level to use."),
			path: zod.z.string().default("logs/nodecg.log").describe("The filepath to log to."),
			timestamps: zod.z.boolean().default(true).describe("Whether to add timestamps to the file logging."),
			replicants: zod.z.boolean().default(false).describe("Whether to enable logging of the Replicants subsystem. Very spammy.")
		}).default({ enabled: false })
	}).default({ console: {} }),
	bundles: zod.z.object({
		enabled: zod.z.array(zod.z.string()).nullable().default(parsedArgv.bundlesEnabled ?? null).describe("A whitelist array of bundle names."),
		disabled: zod.z.array(zod.z.string()).nullable().default(parsedArgv.bundlesDisabled ?? null).describe("A blacklist array of bundle names."),
		paths: zod.z.array(zod.z.string()).default(parsedArgv.bundlesPaths ?? []).describe("An array of additional paths where bundles are located.")
	}).default({
		enabled: null,
		disabled: null,
		paths: []
	}),
	login: zod.z.object({
		enabled: zod.z.boolean().default(false).describe("Whether to enable login security."),
		sessionSecret: zod.z.string().optional().describe("The secret used to salt sessions."),
		forceHttpsReturn: zod.z.boolean().default(false).describe("Forces Steam & Twitch login return URLs to use HTTPS instead of HTTP. Useful in reverse proxy setups."),
		steam: zod.z.object({
			enabled: zod.z.boolean().default(false).describe("Whether to enable Steam authentication."),
			apiKey: zod.z.string().optional().describe("A Steam API Key. Obtained from http://steamcommunity.com/dev/apikey"),
			allowedIds: zod.z.array(zod.z.string()).default([]).describe("Which 64 bit Steam IDs to allow. Can be obtained from https://steamid.io/")
		}).optional().refine((val) => val?.enabled ? typeof val.apiKey === "string" : true, { message: "\"login.steam.apiKey\" must be a string" }),
		twitch: zod.z.object({
			enabled: zod.z.boolean().default(false).describe("Whether to enable Twitch authentication."),
			clientID: zod.z.string().optional().describe("A Twitch application ClientID http://twitch.tv/kraken/oauth2/clients/new"),
			clientSecret: zod.z.string().optional().describe("A Twitch application ClientSecret http://twitch.tv/kraken/oauth2/clients/new"),
			scope: zod.z.string().default("user_read").describe("A space-separated string of Twitch application permissions."),
			allowedUsernames: zod.z.array(zod.z.string()).default([]).describe("Which Twitch usernames to allow."),
			allowedIds: zod.z.array(zod.z.string()).default([]).describe("Which Twitch IDs to allow. Can be obtained from https://twitchinsights.net/checkuser")
		}).optional().refine((val) => val?.enabled ? typeof val.clientID === "string" : true, { message: "\"login.twitch.clientID\" must be a string" }).refine((val) => val?.enabled ? typeof val.clientSecret === "string" : true, { message: "\"login.twitch.clientID\" must be a string" }),
		discord: zod.z.object({
			enabled: zod.z.boolean().default(false).describe("Whether to enable Discord authentication."),
			clientID: zod.z.string().optional().describe("A Discord application ClientID https://discord.com/developers/applications"),
			clientSecret: zod.z.string().optional().describe("A Discord application ClientSecret https://discord.com/developers/applications"),
			scope: zod.z.string().default("identify").describe("A space-separated string of Discord application scopes. https://discord.com/developers/docs/topics/oauth2#shared-resources-oauth2-scopes"),
			allowedUserIDs: zod.z.array(zod.z.string()).default([]).describe("Which Discord user IDs to allow."),
			allowedGuilds: zod.z.array(zod.z.object({
				guildID: zod.z.string().describe("Users in this Discord Server are allowed to log in."),
				allowedRoleIDs: zod.z.array(zod.z.string()).default([]).describe("Additionally require one of the roles on the server to log in."),
				guildBotToken: zod.z.string().default("").describe("Discord bot token, needed if allowedRoleIDs is used.")
			})).default([])
		}).optional().refine((val) => val?.enabled ? typeof val.clientID === "string" : true, { message: "\"login.discord.clientID\" must be a string" }).refine((val) => val?.enabled ? typeof val.clientSecret === "string" : true, { message: "\"login.discord.clientSecret\" must be a string" }),
		local: zod.z.object({
			enabled: zod.z.boolean().default(false).describe("Enable Local authentication."),
			allowedUsers: zod.z.array(zod.z.object({
				username: zod.z.string(),
				password: zod.z.string()
			})).default([]).describe("Which users can log in.")
		}).optional()
	}).refine((val) => val.enabled ? typeof val.sessionSecret === "string" : true, { message: "\"login.sessionSecret\" must be a string" }).default({ enabled: false }),
	ssl: zod.z.object({
		enabled: zod.z.boolean().default(false).describe("Whether to enable SSL/HTTPS encryption."),
		allowHTTP: zod.z.boolean().default(false).describe("Whether to allow insecure HTTP connections while SSL is active."),
		keyPath: zod.z.string().optional().describe("The path to an SSL key file."),
		certificatePath: zod.z.string().optional().describe("The path to an SSL certificate file."),
		passphrase: zod.z.string().optional().describe("The passphrase for the provided key file.")
	}).default({ enabled: false }).refine((val) => val.enabled ? typeof val.keyPath === "string" : true, { message: "\"ssl.keyPath\" must be a string" }).refine((val) => val.enabled ? typeof val.certificatePath === "string" : true, { message: "\"ssl.certificatePath\" must be a string" }),
	sentry: zod.z.object({
		enabled: zod.z.boolean().default(true).describe("Whether to enable Sentry error reporting."),
		dsn: zod.z.string().optional().describe("Your project's DSN, used to route alerts to the correct place.")
	}).default({ enabled: false }).refine((val) => val.enabled ? typeof val.dsn === "string" : true, { message: "\"sentry.dsn\" must be a string" })
}).transform((val) => {
	const host = val.host === "0.0.0.0" ? "localhost" : val.host;
	return {
		...val,
		baseURL: val.baseURL ?? `${host}:${val.port}`
	};
});

//#endregion
//#region src/server/config/loader.ts
const loadConfig = (cfgDirOrFile) => {
	let isFile = false;
	try {
		isFile = node_fs.lstatSync(cfgDirOrFile).isFile();
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
	const cfgDir = isFile ? node_path.dirname(cfgDirOrFile) : cfgDirOrFile;
	const userCfg = (0, cosmiconfig.cosmiconfigSync)("nodecg", {
		searchPlaces: isFile ? [node_path.basename(cfgDirOrFile)] : [
			"nodecg.json",
			"nodecg.yaml",
			"nodecg.yml",
			"nodecg.js",
			"nodecg.config.js"
		],
		stopDir: cfgDir
	}).search(cfgDir)?.config ?? {};
	if (userCfg?.bundles?.enabled && userCfg?.bundles?.disabled) throw new Error("nodecg.json may only contain EITHER bundles.enabled OR bundles.disabled, not both.");
	else if (!userCfg) console.info("[nodecg] No config found, using defaults.");
	const parseResult = nodecgConfigSchema.safeParse(userCfg);
	if (!parseResult.success) {
		console.error("[nodecg] Config invalid:", parseResult.error.errors[0]?.message);
		throw new Error(parseResult.error.errors[0]?.message);
	}
	const config$1 = parseResult.data;
	const filteredConfig$1 = {
		host: config$1.host,
		port: config$1.port,
		baseURL: config$1.baseURL,
		logging: {
			console: {
				enabled: config$1.logging.console.enabled,
				level: config$1.logging.console.level,
				timestamps: config$1.logging.console.timestamps,
				replicants: config$1.logging.console.replicants
			},
			file: {
				enabled: config$1.logging.file.enabled,
				level: config$1.logging.file.level,
				timestamps: config$1.logging.file.timestamps,
				replicants: config$1.logging.file.replicants
			}
		},
		login: { enabled: config$1.login.enabled },
		sentry: {
			enabled: config$1.sentry.enabled,
			dsn: config$1.sentry.enabled ? config$1.sentry.dsn : void 0
		}
	};
	if (config$1.login.enabled && config$1.login.steam) filteredConfig$1.login.steam = { enabled: config$1.login.steam.enabled };
	if (config$1.login.enabled && config$1.login.twitch) filteredConfig$1.login.twitch = {
		enabled: config$1.login.twitch.enabled,
		clientID: config$1.login.twitch.enabled ? config$1.login.twitch.clientID : void 0,
		scope: config$1.login.twitch.enabled ? config$1.login.twitch.scope : void 0
	};
	if (config$1.login.enabled && config$1.login.local) filteredConfig$1.login.local = { enabled: config$1.login.local.enabled };
	if (config$1.login.enabled && config$1.login.discord) filteredConfig$1.login.discord = {
		enabled: config$1.login.discord.enabled,
		clientID: config$1.login.discord.enabled ? config$1.login.discord.clientID : void 0,
		scope: config$1.login.discord.enabled ? config$1.login.discord.scope : void 0
	};
	if (config$1.ssl) filteredConfig$1.ssl = { enabled: config$1.ssl.enabled };
	return {
		config: (0, klona_json.klona)(config$1),
		filteredConfig: (0, klona_json.klona)(filteredConfig$1)
	};
};

//#endregion
//#region src/server/config/index.ts
const cfgDirectoryPath = yargs.argv.cfgPath ?? node_path.join(__nodecg_internal_util.rootPaths.getRuntimeRoot(), "cfg");
if (!node_fs.existsSync(cfgDirectoryPath)) node_fs.mkdirSync(cfgDirectoryPath, { recursive: true });
const { config, filteredConfig } = loadConfig(cfgDirectoryPath);
const exitOnUncaught = config.exitOnUncaught;
const sentryEnabled = config.sentry?.enabled;

//#endregion
//#region src/server/util/authcheck.ts
/**
* Express middleware that checks if the user is authenticated.
*/
const authCheck = async (req, res, next) => {
	try {
		if (!config.login?.enabled) {
			next();
			return;
		}
		let { user } = req;
		let isUsingKeyOrSocketToken = false;
		let keyOrSocketTokenAuthenticated = false;
		if (req.query.key ?? req.cookies.socketToken) {
			isUsingKeyOrSocketToken = true;
			const apiKey = await res.locals.databaseAdapter.findApiKey(req.query.key ?? req.cookies.socketToken);
			if (!apiKey) {
				req.session?.destroy(() => {
					res.clearCookie("socketToken", {
						secure: req.secure,
						sameSite: req.secure ? "none" : void 0
					});
					res.clearCookie("connect.sid", { path: "/" });
					res.clearCookie("io", { path: "/" });
					res.redirect("/login");
				});
				return;
			}
			user = await res.locals.databaseAdapter.findUser(apiKey.user.id) ?? void 0;
		}
		if (!user) {
			if (req.session) req.session.returnTo = req.url;
			res.status(403).redirect("/login");
			return;
		}
		const allowed = res.locals.databaseAdapter.isSuperUser(user);
		keyOrSocketTokenAuthenticated = isUsingKeyOrSocketToken && allowed;
		const provider = user.identities[0].provider_type;
		const providerAllowed = config.login?.[provider]?.enabled;
		if ((keyOrSocketTokenAuthenticated || req.isAuthenticated()) && allowed && providerAllowed) {
			let apiKey = user.apiKeys[0];
			if (!apiKey) {
				apiKey = await res.locals.databaseAdapter.createApiKey();
				user.apiKeys.push(apiKey);
				await res.locals.databaseAdapter.saveUser(user);
			}
			res.cookie("socketToken", apiKey.secret_key, {
				secure: req.secure,
				sameSite: req.secure ? "none" : void 0
			});
			next();
			return;
		}
		if (req.session) req.session.returnTo = req.url;
		res.status(403).redirect("/login");
		return;
	} catch (error) {
		next(error);
	}
};

//#endregion
//#region src/server/util/nodecg-package-json.ts
function recursivelyFindPackageJson(dir) {
	const packageJsonPath = node_path.default.join(dir, "package.json");
	if (node_fs.default.existsSync(packageJsonPath)) {
		const packageJson = JSON.parse(node_fs.default.readFileSync(packageJsonPath, "utf-8"));
		if (packageJson.name === "nodecg") return packageJson;
	}
	const parentDir = node_path.default.dirname(dir);
	if (dir === parentDir) throw new Error("Could not find NodeCG root path");
	return recursivelyFindPackageJson(parentDir);
}
const nodecgPackageJson = recursivelyFindPackageJson(__dirname);

//#endregion
//#region src/server/util/sentry-config.ts
const baseSentryConfig = {
	dsn: config.sentry.enabled ? config.sentry.dsn : "",
	serverName: node_os.hostname(),
	version: nodecgPackageJson.version
};
var SentryConfig = class {
	bundleMetadata = [];
	app = (0, express.default)();
	constructor(bundleManager) {
		const { app, bundleMetadata } = this;
		bundleManager.on("ready", () => {
			__sentry_node.configureScope((scope) => {
				bundleManager.all().forEach((bundle) => {
					bundleMetadata.push({
						name: bundle.name,
						git: bundle.git,
						version: bundle.version
					});
				});
				scope.setExtra("bundles", bundleMetadata);
			});
		});
		bundleManager.on("gitChanged", (bundle) => {
			const metadataToUpdate = bundleMetadata.find((data) => data.name === bundle.name);
			if (!metadataToUpdate) return;
			metadataToUpdate.git = bundle.git;
			metadataToUpdate.version = bundle.version;
		});
		app.get("/sentry.js", authCheck, (_req, res) => {
			res.type(".js");
			res.render(node_path.join(__nodecg_internal_util.rootPaths.nodecgInstalledPath, "dist/server/templates/sentry.js.tmpl"), {
				baseSentryConfig,
				bundleMetadata
			});
		});
	}
};

//#endregion
//#region src/server/logger/logger.server.ts
/**
* A factory that configures and returns a Logger constructor.
*
* @returns A constructor used to create discrete logger instances.
*/
function loggerFactory(initialOpts = {}, sentry = void 0) {
	initialOpts = initialOpts || {};
	initialOpts.console = initialOpts.console ?? {};
	initialOpts.file = initialOpts.file ?? {};
	initialOpts.file.path = initialOpts.file.path ?? "logs/nodecg.log";
	const consoleTransport = new winston.default.transports.Console({
		level: initialOpts.console.level ?? LogLevel.Info,
		silent: !initialOpts.console.enabled,
		stderrLevels: ["warn", "error"],
		format: winston.default.format.combine(winston.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston.default.format.errors({ stack: true }), winston.default.format.colorize(), winston.default.format.printf((info) => `${initialOpts?.console?.timestamps ? `${info.timestamp} - ` : ""}${info.level}: ${info.message}`))
	});
	const fileTransport = new winston.default.transports.File({
		filename: initialOpts.file.path,
		level: initialOpts.file.level ?? LogLevel.Info,
		silent: !initialOpts.file.enabled,
		format: winston.default.format.combine(winston.default.format.timestamp(), winston.default.format.errors({ stack: true }), winston.default.format.printf((info) => `${initialOpts?.file?.timestamps ? `${info.timestamp} - ` : ""}${info.level}: ${info.message}`))
	});
	if (typeof initialOpts.file.path !== "undefined") {
		fileTransport.filename = initialOpts.file.path;
		if (!node_fs.default.existsSync(node_path.dirname(initialOpts.file.path))) node_fs.default.mkdirSync(node_path.dirname(initialOpts.file.path), { recursive: true });
	}
	winston.default.addColors({
		verbose: "green",
		debug: "cyan",
		info: "white",
		warn: "yellow",
		error: "red"
	});
	const consoleLogger = winston.default.createLogger({
		transports: [consoleTransport],
		levels: {
			verbose: 4,
			trace: 4,
			debug: 3,
			info: 2,
			warn: 1,
			error: 0
		}
	});
	const fileLogger = winston.default.createLogger({
		transports: [fileTransport],
		levels: {
			verbose: 4,
			trace: 4,
			debug: 3,
			info: 2,
			warn: 1,
			error: 0
		}
	});
	/**
	* Constructs a new Logger instance that prefixes all output with the given name.
	* @param name {String} - The label to prefix all output of this logger with.
	* @returns {Object} - A Logger instance.
	* @constructor
	*/
	return class Logger$2 {
		static _consoleLogger = consoleLogger;
		static _fileLogger = fileLogger;
		static _shouldConsoleLogReplicants = Boolean(initialOpts.console?.replicants);
		static _shouldFileLogReplicants = Boolean(initialOpts.file?.replicants);
		constructor(name) {
			this.name = name;
			this.name = name;
		}
		trace(...args) {
			[consoleLogger, fileLogger].forEach((logger$1) => logger$1.verbose(`[${this.name}] ${(0, node_util.format)(args[0], ...args.slice(1))}`));
		}
		debug(...args) {
			[consoleLogger, fileLogger].forEach((logger$1) => logger$1.debug(`[${this.name}] ${(0, node_util.format)(args[0], ...args.slice(1))}`));
		}
		info(...args) {
			[consoleLogger, fileLogger].forEach((logger$1) => logger$1.info(`[${this.name}] ${(0, node_util.format)(args[0], ...args.slice(1))}`));
		}
		warn(...args) {
			[consoleLogger, fileLogger].forEach((logger$1) => logger$1.warn(`[${this.name}] ${(0, node_util.format)(args[0], ...args.slice(1))}`));
		}
		error(...args) {
			[consoleLogger, fileLogger].forEach((logger$1) => logger$1.error(`[${this.name}] ${(0, node_util.format)(args[0], ...args.slice(1))}`));
			if (sentry) {
				const formattedArgs = args.map((argument) => typeof argument === "object" ? (0, node_util.inspect)(argument, {
					depth: null,
					showProxy: true
				}) : argument);
				sentry.captureException(/* @__PURE__ */ new Error(`[${this.name}] ` + (0, node_util.format)(formattedArgs[0], ...formattedArgs.slice(1))));
			}
		}
		replicants(...args) {
			if (Logger$2._shouldConsoleLogReplicants) consoleLogger.info(`[${this.name}] ${(0, node_util.format)(args[0], ...args.slice(1))}`);
			if (Logger$2._shouldFileLogReplicants) fileLogger.info(`[${this.name}] ${(0, node_util.format)(args[0], ...args.slice(1))}`);
		}
	};
}

//#endregion
//#region src/server/logger/index.ts
let Logger;
if (config.sentry?.enabled) Logger = loggerFactory(config.logging, __sentry_node);
else Logger = loggerFactory(config.logging);
function createLogger(name) {
	return new Logger(name);
}

//#endregion
//#region src/server/login/index.ts
const log$6 = createLogger("login");
const protocol = config.ssl?.enabled || config.login.enabled && config.login.forceHttpsReturn ? "https" : "http";
async function makeDiscordAPIRequest(guild, userID) {
	const res = await fetch(`https://discord.com/api/v8/guilds/${guild.guildID}/members/${userID}`, { headers: { Authorization: `Bot ${guild.guildBotToken}` } });
	const data = await res.json();
	if (res.status === 200) return [
		guild,
		false,
		data
	];
	return [
		guild,
		true,
		data
	];
}
function createMiddleware(db, callbacks) {
	passport.default.serializeUser((user, done) => {
		done(null, user.id);
	});
	passport.default.deserializeUser(async (id, done) => {
		try {
			done(null, await db.findUser(id));
		} catch (error) {
			done(error);
		}
	});
	if (config.login.enabled && config.login.steam?.enabled && config.login.steam.apiKey) {
		const steamLoginConfig = config.login.steam;
		const apiKey = config.login.steam.apiKey;
		passport.default.use(new passport_steam.default({
			returnURL: `${protocol}://${config.baseURL}/login/auth/steam`,
			realm: `${protocol}://${config.baseURL}/login/auth/steam`,
			apiKey
		}, async (_, profile, done) => {
			try {
				const roles = [];
				if (steamLoginConfig?.allowedIds?.includes(profile.id)) {
					log$6.info("(Steam) Granting \"%s\" (%s) access", profile.id, profile.displayName);
					roles.push(await db.getSuperUserRole());
				} else log$6.info("(Steam) Denying \"%s\" (%s) access", profile.id, profile.displayName);
				done(void 0, await db.upsertUser({
					name: profile.displayName,
					provider_type: "steam",
					provider_hash: profile.id,
					roles
				}));
				return;
			} catch (error) {
				done(error);
			}
		}));
	}
	if (config.login.enabled && config.login.twitch?.enabled) {
		const twitchLoginConfig = config.login.twitch;
		const scopesArray = twitchLoginConfig.scope.split(" ");
		if (!scopesArray.includes("user:read:email")) scopesArray.push("user:read:email");
		const concatScopes = scopesArray.join(" ");
		passport.default.use(new passport_twitch_helix.Strategy({
			clientID: twitchLoginConfig.clientID,
			clientSecret: twitchLoginConfig.clientSecret,
			callbackURL: `${protocol}://${config.baseURL}/login/auth/twitch`,
			scope: concatScopes,
			customHeaders: { "Client-ID": twitchLoginConfig.clientID }
		}, async (accessToken, refreshToken, profile, done) => {
			try {
				const roles = [];
				if (twitchLoginConfig.allowedUsernames?.includes(profile.username) ?? twitchLoginConfig.allowedIds?.includes(profile.id)) {
					log$6.info("(Twitch) Granting %s access", profile.username);
					roles.push(await db.getSuperUserRole());
				} else log$6.info("(Twitch) Denying %s access", profile.username);
				done(void 0, await db.upsertUser({
					name: profile.displayName,
					provider_type: "twitch",
					provider_hash: profile.id,
					provider_access_token: accessToken,
					provider_refresh_token: refreshToken,
					roles
				}));
				return;
			} catch (error) {
				done(error);
			}
		}));
	}
	if (config.login.enabled && config.login.discord?.enabled) {
		const discordLoginConfig = config.login.discord;
		const scopeArray = discordLoginConfig.scope.split(" ");
		if (!scopeArray.includes("identify")) scopeArray.push("identify");
		if (!scopeArray.includes("guilds") && discordLoginConfig.allowedGuilds) scopeArray.push("guilds");
		const scope = scopeArray.join(" ");
		passport.default.use(new passport_discord.Strategy({
			clientID: discordLoginConfig.clientID,
			clientSecret: discordLoginConfig.clientSecret,
			callbackURL: `${protocol}://${config.baseURL}/login/auth/discord`,
			scope
		}, async (accessToken, refreshToken, profile, done) => {
			if (!discordLoginConfig) {
				done(/* @__PURE__ */ new Error("Discord login config was impossibly undefined."));
				return;
			}
			let allowed = false;
			if (discordLoginConfig.allowedUserIDs?.includes(profile.id)) allowed = true;
			else if (discordLoginConfig.allowedGuilds) {
				const intersectingGuilds = discordLoginConfig.allowedGuilds.filter((allowedGuild) => profile.guilds?.some((profileGuild) => profileGuild.id === allowedGuild.guildID));
				const guildRequests = [];
				for (const intersectingGuild of intersectingGuilds) if (!intersectingGuild.allowedRoleIDs || intersectingGuild.allowedRoleIDs.length === 0) allowed = true;
				else guildRequests.push(makeDiscordAPIRequest(intersectingGuild, profile.id));
				if (!allowed) {
					const guildsData = await Promise.all(guildRequests);
					for (const [guildWithRoles, err, memberResponse] of guildsData) {
						if (err) {
							log$6.warn(`Got error while trying to get guild ${guildWithRoles.guildID} (Make sure you're using the correct bot token and guild id): ${JSON.stringify(memberResponse)}`);
							continue;
						}
						if (guildWithRoles.allowedRoleIDs.filter((allowedRole) => memberResponse.roles.includes(allowedRole)).length > 0) {
							allowed = true;
							break;
						}
					}
				}
			} else allowed = false;
			const roles = [];
			if (allowed) {
				log$6.info("(Discord) Granting %s#%s (%s) access", profile.username, profile.discriminator, profile.id);
				roles.push(await db.getSuperUserRole());
			} else log$6.info("(Discord) Denying %s#%s (%s) access", profile.username, profile.discriminator, profile.id);
			done(void 0, await db.upsertUser({
				name: `${profile.username}#${profile.discriminator}`,
				provider_type: "discord",
				provider_hash: profile.id,
				provider_access_token: accessToken,
				provider_refresh_token: refreshToken,
				roles
			}));
		}));
	}
	if (config.login.enabled && config.login.local?.enabled && config.login.sessionSecret) {
		const { sessionSecret, local: { allowedUsers } } = config.login;
		const hashes = node_crypto.getHashes();
		passport.default.use(new passport_local.Strategy({
			usernameField: "username",
			passwordField: "password",
			session: false
		}, async (username, password, done) => {
			try {
				const roles = [];
				const foundUser = allowedUsers?.find((u) => u.username === username);
				let allowed = false;
				if (foundUser) {
					const match = /^([^:]+):(.+)$/.exec(foundUser.password ?? "");
					let expected = foundUser.password;
					let actual = password;
					if (match && hashes.includes(match[1])) {
						expected = match[2];
						actual = node_crypto.createHmac(match[1], sessionSecret).update(actual, "utf8").digest("hex");
					}
					if (expected === actual) {
						allowed = true;
						roles.push(await db.getSuperUserRole());
					}
				}
				log$6.info("(Local) %s \"%s\" access", allowed ? "Granting" : "Denying", username);
				done(void 0, await db.upsertUser({
					name: username,
					provider_type: "local",
					provider_hash: username,
					roles
				}));
				return;
			} catch (error) {
				done(error);
			}
		}));
	}
	const app = (0, express.default)();
	const redirectPostLogin = (req, res) => {
		const url = req.session?.returnTo ?? "/dashboard";
		delete req.session.returnTo;
		res.redirect(url);
		app.emit("login", req.user);
		if (req.user) callbacks.onLogin(req.user);
	};
	if (!config.login.enabled || !config.login.sessionSecret) throw new Error("no session secret defined, can't salt sessions, not safe, aborting");
	app.use((0, cookie_parser.default)(config.login.sessionSecret));
	const sessionMiddleware = (0, express_session.default)({
		resave: false,
		saveUninitialized: false,
		secret: config.login.sessionSecret,
		cookie: {
			path: "/",
			httpOnly: true,
			secure: config.ssl?.enabled
		}
	});
	app.use(sessionMiddleware);
	app.use(passport.default.initialize());
	app.use(passport.default.session());
	app.use("/login", express.default.static(node_path.join(__nodecg_internal_util.rootPaths.nodecgInstalledPath, "dist/client/login")));
	app.get("/login", (req, res) => {
		if (req.user && db.isSuperUser(req.user)) res.redirect("/dashboard");
		else res.render(node_path.join(__nodecg_internal_util.rootPaths.nodecgInstalledPath, "dist/server/templates/login.tmpl"), {
			user: req.user,
			config
		});
	});
	app.get("/authError", (req, res) => {
		res.render(node_path.join(__nodecg_internal_util.rootPaths.nodecgInstalledPath, "dist/server/templates/authError.tmpl"), {
			message: req.query.message,
			code: req.query.code,
			viewUrl: req.query.viewUrl
		});
	});
	app.get("/login/steam", passport.default.authenticate("steam"));
	app.get("/login/auth/steam", passport.default.authenticate("steam", { failureRedirect: "/login" }), redirectPostLogin);
	app.get("/login/twitch", passport.default.authenticate("twitch"));
	app.get("/login/auth/twitch", passport.default.authenticate("twitch", { failureRedirect: "/login" }), redirectPostLogin);
	app.get("/login/discord", passport.default.authenticate("discord"));
	app.get("/login/auth/discord", passport.default.authenticate("discord", { failureRedirect: "/login" }), redirectPostLogin);
	app.get("/login/local", passport.default.authenticate("local"));
	app.post("/login/local", passport.default.authenticate("local", { failureRedirect: "/login" }), redirectPostLogin);
	app.get("/logout", (req, res) => {
		app.emit("logout", req.user);
		req.session?.destroy(() => {
			res.clearCookie("connect.sid", { path: "/" });
			res.clearCookie("io", { path: "/" });
			res.clearCookie("socketToken", {
				secure: req.secure,
				sameSite: req.secure ? "none" : void 0
			});
			res.redirect("/login");
		});
		if (req.user) callbacks.onLogout(req.user);
	});
	return {
		app,
		sessionMiddleware
	};
}

//#endregion
//#region src/shared/utils/errors.ts
/**
* Make a string out of an error (or other equivalents),
* including any additional data such as stack trace if available.
* Safe to use on unknown inputs.
*/
function stringifyError(error, noStack = false) {
	const o = stringifyErrorInner(error);
	if (noStack || !o.stack) return o.message;
	return `${o.message}, ${o.stack}`;
}
function stringifyErrorInner(error) {
	let message;
	let stack;
	if (typeof error === "string") message = error;
	else if (error === null) message = "null";
	else if (error === void 0) message = "undefined";
	else if (error && typeof error === "object") if (typeof error.error === "object" && error.error.message) {
		message = error.error.message;
		stack = error.error.stack;
	} else if (error.reason) if (error.reason.message) {
		message = error.reason.message;
		stack = error.reason.stack || error.reason.reason;
	} else {
		message = error.reason;
		stack = error.stack;
	}
	else if (error.message) {
		message = error.message;
		stack = error.stack;
	} else if (error.details) message = error.details;
	else try {
		message = JSON.stringify(error);
	} catch (e) {
		message = `${error} (stringifyError: ${e})`;
	}
	else message = `${error}`;
	message = `${message}`;
	return {
		message,
		stack
	};
}

//#endregion
//#region src/server/util/debounce-name.ts
const timers$1 = /* @__PURE__ */ new Map();
/**
* A standard debounce, but uses a string `name` as the key instead of the callback.
*/
function debounceName(name, callback, duration = 500) {
	const existing = timers$1.get(name);
	if (existing) clearTimeout(existing);
	timers$1.set(name, setTimeout(() => {
		timers$1.delete(name);
		callback();
	}, duration));
}

//#endregion
//#region src/server/util/is-child-path.ts
/**
* Checks if a given path (dirOrFile) is a child of another given path (parent).
*/
function isChildPath(parent, dirOrFile) {
	if (!path.default.isAbsolute(parent) || !path.default.isAbsolute(dirOrFile)) throw new Error("Both paths must be absolute paths");
	const relative = path.default.relative(parent, dirOrFile);
	return Boolean(relative) && !relative.startsWith("..") && !path.default.isAbsolute(relative);
}

//#endregion
//#region src/server/util/send-file/index.ts
function sendFile(directoryToPreventTraversalOutOf, fileLocation, res, next) {
	if (isChildPath(directoryToPreventTraversalOutOf, fileLocation)) res.sendFile(fileLocation, (error) => {
		if (!error) return;
		if (error.code === "ENOENT") return res.type(node_path.default.extname(fileLocation)).sendStatus(404);
		if (!res.headersSent) return next(error);
	});
	else res.sendStatus(404);
}

//#endregion
//#region src/server/assets.ts
const logger = createLogger("assets");
const getAssetsPath = () => node_path.default.join(__nodecg_internal_util.rootPaths.getRuntimeRoot(), "assets");
const createAssetFile = (filepath, sum) => {
	const parsedPath = node_path.default.parse(filepath);
	const parts = parsedPath.dir.replace(getAssetsPath() + node_path.default.sep, "").split(node_path.default.sep);
	return {
		sum,
		base: parsedPath.base,
		ext: parsedPath.ext,
		name: parsedPath.name,
		namespace: parts[0],
		category: parts[1],
		url: `/assets/${parts[0]}/${parts[1]}/${encodeURIComponent(parsedPath.base)}`
	};
};
const prepareNamespaceAssetsPath = (namespace) => {
	const assetsPath = node_path.default.join(getAssetsPath(), namespace);
	if (!node_fs.default.existsSync(assetsPath)) node_fs.default.mkdirSync(assetsPath);
	return assetsPath;
};
const repsByNamespace = /* @__PURE__ */ new Map();
const getCollectRep = (namespace, category) => {
	return repsByNamespace.get(namespace)?.get(category);
};
const resolveDeferreds = (deferredFiles) => {
	let foundNull = false;
	deferredFiles.forEach((uf) => {
		if (uf === null) foundNull = true;
	});
	if (!foundNull) {
		deferredFiles.forEach((uploadedFile) => {
			if (!uploadedFile) return;
			const rep = getCollectRep(uploadedFile.namespace, uploadedFile.category);
			if (rep) rep.value.push(uploadedFile);
		});
		deferredFiles.clear();
	}
};
const createAssetsMiddleware = (bundles$1, replicator) => {
	const assetsPath = getAssetsPath();
	if (!node_fs.default.existsSync(assetsPath)) node_fs.default.mkdirSync(assetsPath);
	const collectionsRep = replicator.declare("collections", "_assets", {
		defaultValue: [],
		persistent: false
	});
	const collections = [];
	for (const bundle of bundles$1) {
		if (!bundle.hasAssignableSoundCues && (!bundle.assetCategories || bundle.assetCategories.length <= 0)) continue;
		if (bundle.hasAssignableSoundCues) bundle.assetCategories.unshift({
			name: "sounds",
			title: "Sounds",
			allowedTypes: ["mp3", "ogg"]
		});
		collections.push({
			name: bundle.name,
			categories: bundle.assetCategories
		});
	}
	const watchDirs = [];
	for (const collection of collections) {
		const namespacedAssetsPath = prepareNamespaceAssetsPath(collection.name);
		const collectionReps = /* @__PURE__ */ new Map();
		repsByNamespace.set(collection.name, collectionReps);
		collectionsRep.value.push({
			name: collection.name,
			categories: collection.categories
		});
		for (const category of collection.categories) {
			const categoryPath = node_path.default.join(namespacedAssetsPath, category.name);
			if (!node_fs.default.existsSync(categoryPath)) node_fs.default.mkdirSync(categoryPath);
			collectionReps.set(category.name, replicator.declare(`assets:${category.name}`, collection.name, {
				defaultValue: [],
				persistent: false
			}));
			if (category.allowedTypes && category.allowedTypes.length > 0) watchDirs.push({
				path: categoryPath,
				types: category.allowedTypes ?? []
			});
			else watchDirs.push({
				path: categoryPath,
				types: []
			});
		}
	}
	const fixedPaths = Array.from(watchDirs).map((pattern) => ({
		...pattern,
		path: pattern.path.replace(/\\/g, "/")
	}));
	const watcher$1 = chokidar.default.watch(fixedPaths.map((path$13) => path$13.path), { ignored: (val, stats) => {
		if (!stats?.isFile()) return false;
		for (const path$13 of fixedPaths) if (val.startsWith(path$13.path)) return !path$13.types.includes((0, node_path.extname)(val).slice(1));
		return false;
	} });
	/**
	* When the Chokidar watcher first starts up, it will fire an 'add' event for each file found.
	* After that, it will emit the 'ready' event.
	* To avoid thrashing the replicant, we want to add all of these first files at once.
	* This is what the ready Boolean, deferredFiles Map, and resolveDeferreds function are for.
	*/
	let ready = false;
	const deferredFiles = /* @__PURE__ */ new Map();
	watcher$1.on("add", async (filepath) => {
		if (!ready) deferredFiles.set(filepath, void 0);
		try {
			const uploadedFile = createAssetFile(filepath, await hasha.default.fromFile(filepath, { algorithm: "sha1" }));
			if (deferredFiles) {
				deferredFiles.set(filepath, uploadedFile);
				resolveDeferreds(deferredFiles);
			} else {
				const rep = getCollectRep(uploadedFile.namespace, uploadedFile.category);
				if (rep) rep.value.push(uploadedFile);
			}
		} catch (err) {
			if (deferredFiles) deferredFiles.delete(filepath);
			logger.error(stringifyError(err));
		}
	});
	watcher$1.on("ready", () => {
		ready = true;
	});
	watcher$1.on("change", (filepath) => {
		debounceName(filepath, async () => {
			try {
				const newUploadedFile = createAssetFile(filepath, await hasha.default.fromFile(filepath, { algorithm: "sha1" }));
				const rep = getCollectRep(newUploadedFile.namespace, newUploadedFile.category);
				if (!rep) throw new Error("should have had a replicant here");
				const index = rep.value.findIndex((uf) => uf.url === newUploadedFile.url);
				if (index > -1) rep.value.splice(index, 1, newUploadedFile);
				else rep.value.push(newUploadedFile);
			} catch (err) {
				logger.error(stringifyError(err));
			}
		});
	});
	watcher$1.on("unlink", (filepath) => {
		const deletedFile = createAssetFile(filepath, "temp");
		const rep = getCollectRep(deletedFile.namespace, deletedFile.category);
		if (!rep) return;
		rep.value.some((assetFile, index) => {
			if (assetFile.url === deletedFile.url) {
				rep.value.splice(index, 1);
				logger.debug("\"%s\" was deleted", deletedFile.url);
				return true;
			}
			return false;
		});
	});
	watcher$1.on("error", (e) => {
		logger.error(e.stack);
	});
	const assetsRouter = express.default.Router();
	const uploader = (0, multer.default)({ storage: multer.default.diskStorage({
		destination: getAssetsPath(),
		filename: (req, file, cb) => {
			const params = req.params;
			cb(null, `${params.namespace}/${params.category}/${Buffer.from(file.originalname, "latin1").toString("utf8")}`);
		}
	}) }).array("file", 64);
	const getParamsSchema = zod.z.object({
		namespace: zod.z.string(),
		category: zod.z.string(),
		filePath: zod.z.string()
	});
	assetsRouter.get("/:namespace/:category/:filePath", authCheck, (req, res, next) => {
		const params = getParamsSchema.parse(req.params);
		const parentDir = getAssetsPath();
		sendFile(parentDir, node_path.default.join(parentDir, params.namespace, params.category, params.filePath), res, next);
	});
	assetsRouter.post("/:namespace/:category", authCheck, (req, res, next) => {
		uploader(req, res, (err) => {
			if (err) {
				console.error(err);
				res.send(500);
				return;
			}
			next();
		});
	}, (req, res) => {
		if (req.files) res.status(200).send("Success");
		else res.status(400).send("Bad Request");
	});
	const deleteParamsSchema = zod.z.object({
		namespace: zod.z.string(),
		category: zod.z.string(),
		filename: zod.z.string()
	});
	assetsRouter.delete("/:namespace/:category/:filename", authCheck, (req, res) => {
		const params = deleteParamsSchema.parse(req.params);
		const fullPath = node_path.default.join(getAssetsPath(), params.namespace, params.category, params.filename);
		node_fs.default.unlink(fullPath, (err) => {
			if (err) {
				if (err.code === "ENOENT") return res.status(410).send(`The file to delete does not exist: ${params.filename}`);
				logger.error(`Failed to delete file ${fullPath}`, err);
				return res.status(500).send(`Failed to delete file: ${params.filename}`);
			}
			return res.sendStatus(200);
		});
	});
	return assetsRouter;
};

//#endregion
//#region src/shared/typed-emitter.ts
var TypedEmitter = class {
	_emitter = new events.EventEmitter();
	addListener(eventName, fn) {
		this._emitter.addListener(eventName, fn);
	}
	on(eventName, fn) {
		this._emitter.on(eventName, fn);
	}
	off(eventName, fn) {
		this._emitter.off(eventName, fn);
	}
	removeListener(eventName, fn) {
		this._emitter.removeListener(eventName, fn);
	}
	emit(eventName, ...params) {
		this._emitter.emit(eventName, ...params);
	}
	once(eventName, fn) {
		this._emitter.once(eventName, fn);
	}
	setMaxListeners(max) {
		this._emitter.setMaxListeners(max);
	}
	listenerCount(eventName) {
		return this._emitter.listenerCount(eventName);
	}
	listeners(eventName) {
		return this._emitter.listeners(eventName);
	}
};

//#endregion
//#region src/server/util-fp/fs/read-file-sync.ts
const readFileSync = fp_ts_IOEither.tryCatchK((path$13) => node_fs.default.readFileSync(path$13, "utf-8"), fp_ts_Either.toError);

//#endregion
//#region src/server/util-fp/parse-json.ts
const parseJson = fp_ts_Either.tryCatchK((json) => JSON.parse(json), fp_ts_Either.toError);

//#endregion
//#region src/server/util-fp/read-json-file-sync.ts
const readJsonFileSync = (0, fp_ts_function.flow)(readFileSync, fp_ts_IOEither.flatMap(fp_ts_IOEither.fromEitherK(parseJson)));

//#endregion
//#region src/server/bundle-parser/assets.ts
function parseAssets(manifest) {
	if (!manifest.assetCategories) return [];
	if (!Array.isArray(manifest.assetCategories)) throw new Error(`${manifest.name}'s nodecg.assetCategories is not an Array`);
	return manifest.assetCategories.map((category, index) => {
		if (typeof category.name !== "string") throw new Error(`nodecg.assetCategories[${index}] in bundle ${manifest.name} lacks a "name" property`);
		if (category.name.toLowerCase() === "sounds") throw new Error(`"sounds" is a reserved assetCategory name. Please change nodecg.assetCategories[${index}].name in bundle ${manifest.name}`);
		if (typeof category.title !== "string") throw new Error(`nodecg.assetCategories[${index}] in bundle ${manifest.name} lacks a "title" property`);
		if (category.allowedTypes && !Array.isArray(category.allowedTypes)) throw new Error(`nodecg.assetCategories[${index}].allowedTypes in bundle ${manifest.name} is not an Array`);
		return category;
	});
}

//#endregion
//#region src/shared/utils/compileJsonSchema.ts
const options = {
	allErrors: true,
	verbose: true,
	strict: "log"
};
const ajv$1 = {
	draft04: (0, ajv_formats.default)(new ajv_draft_04.default(options)),
	draft07: (0, ajv_formats.default)(new ajv.default(options)),
	"draft2019-09": (0, ajv_formats.default)(new ajv_dist_2019.default(options)),
	"draft2020-12": (0, ajv_formats.default)(new ajv_dist_2020.default(options))
};
function compileJsonSchema(schema) {
	const schemaVersion = extractSchemaVersion(schema);
	if (schemaVersion.includes("draft-04")) return ajv$1.draft04.compile(schema);
	if (schemaVersion.includes("draft-07")) return ajv$1.draft07.compile(schema);
	if (schemaVersion.includes("draft/2019-09")) return ajv$1["draft2019-09"].compile(schema);
	if (schemaVersion.includes("draft/2020-12")) return ajv$1["draft2020-12"].compile(schema);
	throw new Error(`Unsupported JSON Schema version "${schemaVersion}"`);
}
function formatJsonSchemaErrors(schema, errors) {
	const schemaVersion = extractSchemaVersion(schema);
	if (schemaVersion.includes("draft-04")) return ajv$1.draft04.errorsText(errors).replace(/^data\//gm, "");
	if (schemaVersion.includes("draft-07")) return ajv$1.draft07.errorsText(errors).replace(/^data\//gm, "");
	if (schemaVersion.includes("draft/2019-09")) return ajv$1["draft2019-09"].errorsText(errors).replace(/^data\//gm, "");
	if (schemaVersion.includes("draft/2020-12")) return ajv$1["draft2020-12"].errorsText(errors).replace(/^data\//gm, "");
	throw new Error(`Unsupported JSON Schema version "${schemaVersion}"`);
}
function getSchemaDefault(schema, labelForDebugging) {
	try {
		return (0, __nodecg_json_schema_defaults.default)(schema);
	} catch (error) {
		throw new Error(`Error generating default value(s) for schema "${labelForDebugging}":\n\t${stringifyError(error)}`);
	}
}
const getSchemaDefaultFp = (schema, labelForDebugging) => fp_ts_Either.tryCatch(() => (0, __nodecg_json_schema_defaults.default)(schema), (error) => /* @__PURE__ */ new Error(`Error generating default value(s) for schema "${labelForDebugging}":\n\t${stringifyError(error)}`));
function extractSchemaVersion(schema) {
	const defaultVersion = "https://json-schema.org/draft-04/schema";
	const extractedVersion = schema.$schema;
	return typeof extractedVersion === "string" ? extractedVersion : defaultVersion;
}

//#endregion
//#region src/server/util-fp/fs/exists-sync.ts
const existsSync = (path$13) => () => node_fs.default.existsSync(path$13);

//#endregion
//#region src/server/bundle-parser/config.ts
const parseSchema = (bundleName) => (0, fp_ts_function.flow)(readJsonFileSync, fp_ts_IOEither.map((json) => json), fp_ts_IOEither.mapError(() => {
	return /* @__PURE__ */ new Error(`configschema.json for bundle "${bundleName}" could not be read. Ensure that it is valid JSON.`);
}));
const createConfigschemaPath = (bundleDir) => node_path.join(bundleDir, "configschema.json");
const parseDefaults = (bundleName) => (0, fp_ts_function.flow)(createConfigschemaPath, (schemaPath) => (0, fp_ts_function.pipe)(existsSync(schemaPath), fp_ts_IO.flatMap(fp_ts_boolean.match(() => fp_ts_IOEither.of({}), (0, fp_ts_function.flow)(() => parseSchema(bundleName)(schemaPath), fp_ts_IOEither.flatMapEither((schema) => getSchemaDefaultFp(schema, bundleName)), fp_ts_IOEither.map((defaults$1) => defaults$1))))));
function parseBundleConfig(bundleName, bundleDir, userConfig) {
	const cfgSchemaPath = node_path.resolve(bundleDir, "configschema.json");
	if (!existsSync(cfgSchemaPath)()) return userConfig;
	const schema = (0, fp_ts_function.pipe)(parseSchema(bundleName)(cfgSchemaPath), fp_ts_IOEither.getOrElse((error) => {
		throw error;
	}))();
	const defaultConfig = getSchemaDefault(schema, bundleName);
	let validateUserConfig;
	try {
		validateUserConfig = compileJsonSchema(schema);
	} catch (error) {
		throw new Error(`Error compiling JSON Schema for bundle config "${bundleName}":\n\t${stringifyError(error)}`);
	}
	const userConfigValid = validateUserConfig(userConfig);
	let finalConfig;
	if (userConfigValid) {
		finalConfig = (0, klona_json.klona)(userConfig);
		for (const key in defaultConfig) {
			/* istanbul ignore if */
			if (!{}.hasOwnProperty.call(defaultConfig, key)) continue;
			const _foo = {};
			_foo[key] = defaultConfig[key];
			const _tempMerged = (0, extend.default)(true, _foo, (0, klona_json.klona)(finalConfig));
			if (validateUserConfig(_tempMerged)) finalConfig = _tempMerged;
		}
	} else finalConfig = (0, extend.default)(true, defaultConfig, userConfig);
	if (validateUserConfig(finalConfig)) return finalConfig;
	throw new Error(`Config for bundle "${bundleName}" is invalid:\n${formatJsonSchemaErrors(schema, validateUserConfig.errors)}`);
}

//#endregion
//#region src/server/bundle-parser/extension.ts
function parseExtension(bundleDir, manifest) {
	const singleFilePath = path.resolve(bundleDir, "extension.js");
	const directoryPath = path.resolve(bundleDir, "extension");
	const singleFileExists = fs.existsSync(singleFilePath);
	const directoryExists = fs.existsSync(directoryPath);
	if (directoryExists && !fs.lstatSync(directoryPath).isDirectory()) throw new Error(`${manifest.name} has an illegal file named "extension" in its root. Either rename it to "extension.js", or make a directory named "extension"`);
	if (singleFileExists && directoryExists) throw new Error(`${manifest.name} has both "extension.js" and a folder named "extension". There can only be one of these, not both.`);
	return singleFileExists || directoryExists;
}

//#endregion
//#region src/server/bundle-parser/git.ts
function parseGit(bundleDir) {
	const workingDir = process.cwd();
	let retValue;
	try {
		const branch = git_rev_sync.branch(bundleDir);
		const hash = git_rev_sync.long(bundleDir);
		const shortHash = git_rev_sync.short(bundleDir);
		try {
			process.chdir(bundleDir);
			retValue = {
				branch,
				hash,
				shortHash,
				date: git_rev_sync.date().toISOString(),
				message: git_rev_sync.message()
			};
		} catch {
			retValue = {
				branch,
				hash,
				shortHash
			};
		}
	} catch {}
	process.chdir(workingDir);
	return retValue;
}

//#endregion
//#region src/server/bundle-parser/graphics.ts
function parseGraphics(graphicsDir, manifest) {
	const graphics = [];
	if (fs.existsSync(graphicsDir) && typeof manifest.graphics === "undefined") throw new Error(`${manifest.name} has a "graphics" folder, but no "nodecg.graphics" property was found in its package.json`);
	if (!fs.existsSync(graphicsDir) && typeof manifest.graphics !== "undefined") throw new Error(`${manifest.name} has a "nodecg.graphics" property in its package.json, but no "graphics" folder`);
	if (!fs.existsSync(graphicsDir) && typeof manifest.graphics === "undefined") return graphics;
	if (!manifest.graphics) return graphics;
	manifest.graphics.forEach((graphic, index) => {
		const missingProps = [];
		if (typeof graphic.file === "undefined") missingProps.push("file");
		if (typeof graphic.width === "undefined") missingProps.push("width");
		if (typeof graphic.height === "undefined") missingProps.push("height");
		if (missingProps.length) throw new Error(`Graphic #${index} could not be parsed as it is missing the following properties: ` + missingProps.join(", "));
		if (graphics.some((g) => g.file === graphic.file)) throw new Error(`Graphic #${index} (${graphic.file}) has the same file as another graphic in ${manifest.name}`);
		const filePath = path.join(graphicsDir, graphic.file);
		fs.accessSync(filePath, fs.constants.F_OK | fs.constants.R_OK);
		const parsedGraphic = {
			...graphic,
			singleInstance: Boolean(graphic.singleInstance),
			url: `/bundles/${manifest.name}/graphics/${graphic.file}`
		};
		graphics.push(parsedGraphic);
	});
	return graphics;
}

//#endregion
//#region src/server/bundle-parser/manifest.ts
const parseManifest = (bundlePath) => (packageJson) => {
	if (!packageJson.name) return fp_ts_IOEither.left(/* @__PURE__ */ new Error(`${bundlePath}'s package.json must specify "name".`));
	if ((0, __nodecg_internal_util.isLegacyProject)()) {
		if (!packageJson.nodecg) return fp_ts_IOEither.left(/* @__PURE__ */ new Error(`${packageJson.name}'s package.json lacks a "nodecg" property, and therefore cannot be parsed.`));
		if (!semver.default.validRange(packageJson.nodecg.compatibleRange)) return fp_ts_IOEither.left(/* @__PURE__ */ new Error(`${packageJson.name}'s package.json does not have a valid "nodecg.compatibleRange" property.`));
		const bundleFolderName = node_path.basename(bundlePath);
		if (bundleFolderName !== packageJson.name) return fp_ts_IOEither.left(/* @__PURE__ */ new Error(`${packageJson.name}'s folder is named "${bundleFolderName}". Please rename it to "${packageJson.name}".`));
	}
	return fp_ts_IOEither.right({
		...packageJson.nodecg,
		name: packageJson.name,
		version: packageJson.version,
		license: packageJson.license,
		description: packageJson.description,
		homepage: packageJson.homepage,
		author: packageJson.author,
		contributors: packageJson.contributors,
		transformBareModuleSpecifiers: Boolean(packageJson.nodecg?.transformBareModuleSpecifiers)
	});
};

//#endregion
//#region src/server/bundle-parser/mounts.ts
function parseMounts(manifest) {
	const mounts = [];
	if (typeof manifest.mount === "undefined" || manifest.mount.length <= 0) return mounts;
	if (!Array.isArray(manifest.mount)) throw new Error(`${manifest.name} has an invalid "nodecg.mount" property in its package.json, it must be an array`);
	manifest.mount.forEach((mount, index) => {
		const missingProps = [];
		if (typeof mount.directory === "undefined") missingProps.push("directory");
		if (typeof mount.endpoint === "undefined") missingProps.push("endpoint");
		if (missingProps.length > 0) throw new Error(`Mount #${index} could not be parsed as it is missing the following properties: ` + missingProps.join(", "));
		if (mount.endpoint.endsWith("/")) mount.endpoint = mount.endpoint.slice(0, -1);
		mounts.push(mount);
	});
	return mounts;
}

//#endregion
//#region src/server/bundle-parser/panels.ts
function parsePanels(dashboardDir, manifest) {
	const unparsedPanels = manifest.dashboardPanels ?? void 0;
	const dashboardDirExists = fs.existsSync(dashboardDir);
	if (!dashboardDirExists && typeof unparsedPanels === "undefined") return [];
	const bundleName = manifest.name;
	const panels = [];
	if (dashboardDirExists && typeof unparsedPanels === "undefined") throw new Error(`${bundleName} has a "dashboard" folder, but no "nodecg.dashboardPanels" property was found in its package.json`);
	unparsedPanels?.forEach((panel, index) => {
		assertRequiredProps(panel, index);
		if (panels.some((p) => p.name === panel.name)) throw new Error(`Panel #${index} (${panel.name}) has the same name as another panel in ${bundleName}.`);
		const filePath = path.join(dashboardDir, panel.file);
		if (!fs.existsSync(filePath)) throw new Error(`Panel file "${panel.file}" in bundle "${bundleName}" does not exist.`);
		const panelStr = fs.readFileSync(filePath, "utf8");
		const $ = cheerio.default.load(panelStr.trim());
		if (!$.html().match(/(<!doctype )/gi)) throw new Error(`Panel "${path.basename(panel.file)}" in bundle "${bundleName}" has no DOCTYPE,panel resizing will not work. Add <!DOCTYPE html> to it.`);
		if (panel.dialog && panel.workspace) throw new Error(`Dialog "${path.basename(panel.file)}" in bundle "${bundleName}" has a "workspace" configured. Dialogs don't get put into workspaces. Either remove the "workspace" property from this dialog, or turn it into a normal panel by setting "dialog" to false.`);
		if (panel.dialog && panel.fullbleed) throw new Error(`Panel "${path.basename(panel.file)}" in bundle "${bundleName}" is fullbleed, but it also a dialog. Fullbleed panels cannot be dialogs. Either set fullbleed or dialog to false.`);
		if (panel.fullbleed && panel.workspace) throw new Error(`Panel "${path.basename(panel.file)}" in bundle "${bundleName}" is fullbleed, but it also has a workspace defined. Fullbleed panels are not allowed to define a workspace, as they are automatically put into their own workspace. Either set fullbleed to false or remove the workspace property from this panel.`);
		if (panel.fullbleed && typeof panel.width !== "undefined") throw new Error(`Panel "${path.basename(panel.file)}" in bundle "${bundleName}" is fullbleed, but it also has a width defined. Fullbleed panels have their width set based on the, width of the browser viewport. Either set fullbleed to false or remove the width property from this panel.`);
		if (panel.workspace?.toLowerCase().startsWith("__nodecg")) throw new Error(`Panel "${path.basename(panel.file)}" in bundle "${bundleName}" is in a workspace whose name begins with __nodecg, which is a reserved string. Please change the name of this workspace to not begin with this string.`);
		let sizeInfo;
		if (panel.fullbleed) sizeInfo = { fullbleed: true };
		else sizeInfo = {
			fullbleed: false,
			width: panel.width ?? 1
		};
		let workspaceInfo;
		if (panel.dialog) workspaceInfo = {
			dialog: true,
			dialogButtons: panel.dialogButtons
		};
		else workspaceInfo = {
			dialog: false,
			workspace: panel.workspace ? panel.workspace.toLowerCase() : "default"
		};
		const parsedPanel = {
			name: panel.name,
			title: panel.title,
			file: panel.file,
			...sizeInfo,
			...workspaceInfo,
			path: filePath,
			headerColor: panel.headerColor ?? "#525F78",
			bundleName,
			html: $.html()
		};
		panels.push(parsedPanel);
	});
	return panels;
}
function assertRequiredProps(panel, index) {
	const missingProps = [];
	if (typeof panel.name === "undefined") missingProps.push("name");
	if (typeof panel.title === "undefined") missingProps.push("title");
	if (typeof panel.file === "undefined") missingProps.push("file");
	if (missingProps.length) throw new Error(`Panel #${index} could not be parsed as it is missing the following properties: ` + missingProps.join(", "));
}

//#endregion
//#region src/server/bundle-parser/sounds.ts
function parseSounds(bundlePath, manifest) {
	if (!manifest.soundCues) return {
		soundCues: [],
		hasAssignableSoundCues: false
	};
	if (!Array.isArray(manifest.soundCues)) throw new Error(`${manifest.name}'s nodecg.soundCues is not an Array`);
	let hasAssignable = false;
	return {
		soundCues: manifest.soundCues.map((unparsedCue, index) => {
			if (typeof unparsedCue.name !== "string") throw new Error(`nodecg.soundCues[${index}] in bundle ${manifest.name} lacks a "name" property`);
			const parsedCue = { ...unparsedCue };
			if (typeof parsedCue.assignable === "undefined") parsedCue.assignable = true;
			if (parsedCue.assignable) hasAssignable = true;
			if (parsedCue.defaultVolume) {
				parsedCue.defaultVolume = Math.min(parsedCue.defaultVolume, 100);
				parsedCue.defaultVolume = Math.max(parsedCue.defaultVolume, 0);
			}
			if (parsedCue.defaultFile) {
				const defaultFilePath = path.join(bundlePath, parsedCue.defaultFile);
				if (!fs.existsSync(defaultFilePath)) throw new Error(`nodecg.soundCues[${index}].defaultFile in bundle ${manifest.name} does not exist`);
			}
			return parsedCue;
		}),
		hasAssignableSoundCues: hasAssignable
	};
}

//#endregion
//#region src/server/bundle-parser/index.ts
const readBundlePackageJson = (bundlePath) => (0, fp_ts_function.pipe)(bundlePath, (bundlePath$1) => node_path.default.join(bundlePath$1, "package.json"), readJsonFileSync, fp_ts_IOEither.map((json) => json), fp_ts_IOEither.mapLeft((error) => {
	if (error.code === "ENOENT") return /* @__PURE__ */ new Error(`Bundle at path ${bundlePath} does not contain a package.json!`);
	if (error instanceof SyntaxError) return /* @__PURE__ */ new Error(`${bundlePath}'s package.json is not valid JSON, please check it against a validator such as jsonlint.com`);
	return error;
}));
const parseBundleNodecgConfig = (0, fp_ts_function.flow)((bundlePath) => node_path.default.join(bundlePath, "nodecg.config.js"), fp_ts_IOEither.tryCatchK(require, fp_ts_Either.toError), fp_ts_IOEither.match(() => ({}), (config$1) => config$1.default || config$1), fp_ts_IOEither.fromIO, fp_ts_IOEither.flatMap((config$1) => {
	if (typeof config$1 !== "object" || config$1 === null || Array.isArray(config$1)) return fp_ts_IOEither.left(/* @__PURE__ */ new Error("nodecg.config.js must export an object"));
	return fp_ts_IOEither.right(config$1);
}));
const parseBundle = (bundlePath, bundleCfg) => {
	const manifest = (0, fp_ts_function.pipe)(bundlePath, readBundlePackageJson, fp_ts_IOEither.flatMap(parseManifest(bundlePath)), fp_ts_IOEither.getOrElse((error) => {
		throw error;
	}))();
	const dashboardDir = node_path.default.resolve(bundlePath, "dashboard");
	const graphicsDir = node_path.default.resolve(bundlePath, "graphics");
	const nodecgBundleConfig = (0, fp_ts_function.pipe)(parseBundleNodecgConfig(bundlePath), fp_ts_IOEither.getOrElse((error) => {
		throw error;
	}))();
	const config$1 = (0, fp_ts_function.pipe)(bundleCfg, fp_ts_Option.fromNullable, fp_ts_Option.match(() => parseDefaults(manifest.name)(bundlePath), fp_ts_IOEither.tryCatchK((bundleCfg$1) => parseBundleConfig(manifest.name, bundlePath, bundleCfg$1), fp_ts_Either.toError)), fp_ts_IOEither.getOrElse((error) => {
		throw error;
	}))();
	return {
		...manifest,
		dir: bundlePath,
		config: config$1,
		dashboard: {
			dir: dashboardDir,
			panels: parsePanels(dashboardDir, manifest)
		},
		mount: parseMounts(manifest),
		graphics: parseGraphics(graphicsDir, manifest),
		assetCategories: parseAssets(manifest),
		hasExtension: parseExtension(bundlePath, manifest),
		git: parseGit(bundlePath),
		...parseSounds(bundlePath, manifest),
		nodecgBundleConfig
	};
};

//#endregion
//#region src/server/bundle-manager.ts
/**
* Milliseconds
*/
const READY_WAIT_THRESHOLD = 1e3;
const watcher = chokidar.default.watch([], {
	persistent: true,
	ignoreInitial: true,
	followSymlinks: true,
	ignored: [
		/\/.+___jb_.+___/,
		/\/node_modules\//,
		/\/bower_components\//,
		/\/.+\.lock/
	]
});
const blacklistedBundleDirectories = ["node_modules", "bower_components"];
const bundles = [];
const log$5 = createLogger("bundle-manager");
const hasChanged = /* @__PURE__ */ new Set();
let backoffTimer;
var BundleManager = class extends TypedEmitter {
	bundles = [];
	get ready() {
		return this._ready;
	}
	_ready = false;
	_cfgPath;
	_debouncedGitChangeHandler = (0, lodash.debounce)((bundleName) => {
		const bundle = this.find(bundleName);
		if (!bundle) return;
		bundle.git = parseGit(bundle.dir);
		this.emit("gitChanged", bundle);
	}, 250);
	constructor(bundlesPaths, cfgPath, nodecgVersion, nodecgConfig) {
		super();
		this._cfgPath = cfgPath;
		const readyTimeout = setTimeout(() => {
			this._ready = true;
			this.emit("ready");
		}, READY_WAIT_THRESHOLD);
		((0, __nodecg_internal_util.isLegacyProject)() ? bundlesPaths : [__nodecg_internal_util.rootPaths.runtimeRootPath, ...bundlesPaths]).forEach((bundlesPath) => {
			log$5.trace(`Loading bundles from ${bundlesPath}`);
			/* istanbul ignore next */
			watcher.on("add", (filePath) => {
				const bundleName = getParentProjectName(filePath, bundlesPath);
				if (!bundleName) return;
				if (this.isPanelHTMLFile(bundleName, filePath)) this.handleChange(bundleName);
				else if (isGitData(bundleName, filePath)) this._debouncedGitChangeHandler(bundleName);
				if (!this.ready) readyTimeout.refresh();
			});
			watcher.on("change", (filePath) => {
				const bundleName = getParentProjectName(filePath, bundlesPath);
				if (!bundleName) return;
				if (isManifest(bundleName, filePath) || this.isPanelHTMLFile(bundleName, filePath)) this.handleChange(bundleName);
				else if (isGitData(bundleName, filePath)) this._debouncedGitChangeHandler(bundleName);
			});
			watcher.on("unlink", (filePath) => {
				const bundleName = getParentProjectName(filePath, bundlesPath);
				if (!bundleName) return;
				if (this.isPanelHTMLFile(bundleName, filePath)) this.handleChange(bundleName);
				else if (isGitData(bundleName, filePath)) this._debouncedGitChangeHandler(bundleName);
			});
			/* istanbul ignore next */
			watcher.on("error", (error) => {
				log$5.error(error.stack);
			});
			const handleBundle = (bundlePath) => {
				if (!node_fs.default.statSync(bundlePath).isDirectory()) return;
				const bundleFolderName = node_path.default.basename(bundlePath);
				if (blacklistedBundleDirectories.includes(bundleFolderName) || bundleFolderName.startsWith(".")) return;
				const bundlePackageJson = node_fs.default.readFileSync(node_path.default.join(bundlePath, "package.json"), "utf-8");
				const bundleName = JSON.parse(bundlePackageJson).name;
				if (nodecgConfig?.bundles?.disabled?.includes(bundleName)) {
					log$5.debug(`Not loading bundle ${bundleName} as it is disabled in config`);
					return;
				}
				if (nodecgConfig?.bundles?.enabled && !nodecgConfig?.bundles.enabled.includes(bundleName)) {
					log$5.debug(`Not loading bundle ${bundleName} as it is not enabled in config`);
					return;
				}
				log$5.debug(`Loading bundle ${bundleName}`);
				const bundle = parseBundle(bundlePath, loadBundleCfg(cfgPath, bundleName));
				if ((0, __nodecg_internal_util.isLegacyProject)()) {
					if (!bundle.compatibleRange) {
						log$5.error(`${bundle.name}'s package.json does not have a "nodecg.compatibleRange" property.`);
						return;
					}
					if (!semver.default.satisfies(nodecgVersion, bundle.compatibleRange)) {
						log$5.error(`${bundle.name} requires NodeCG version ${bundle.compatibleRange}, current version is ${nodecgVersion}`);
						return;
					}
				}
				bundles.push(bundle);
				watcher.add([
					node_path.default.join(bundlePath, ".git"),
					node_path.default.join(bundlePath, "dashboard"),
					node_path.default.join(bundlePath, "package.json")
				]);
			};
			if (bundlesPath === __nodecg_internal_util.rootPaths.runtimeRootPath) handleBundle(__nodecg_internal_util.rootPaths.runtimeRootPath);
			else if (node_fs.default.existsSync(bundlesPath)) node_fs.default.readdirSync(bundlesPath).forEach((bundleFolderName) => {
				handleBundle(node_path.default.join(bundlesPath, bundleFolderName));
			});
		});
	}
	/**
	* Returns a shallow-cloned array of all currently active bundles.
	* @returns {Array.<Object>}
	*/
	all() {
		return bundles.slice(0);
	}
	/**
	* Returns the bundle with the given name. undefined if not found.
	* @param name {String} - The name of the bundle to find.
	* @returns {Object|undefined}
	*/
	find(name) {
		return bundles.find((b) => b.name === name);
	}
	/**
	* Adds a bundle to the internal list, replacing any existing bundle with the same name.
	* @param bundle {Object}
	*/
	add(bundle) {
		/* istanbul ignore if: Again, it shouldn't be possible for "bundle" to be undefined, but just in case... */
		if (!bundle) return;
		if (this.find(bundle.name)) this.remove(bundle.name);
		bundles.push(bundle);
	}
	/**
	* Removes a bundle with the given name from the internal list. Does nothing if no match found.
	* @param bundleName {String}
	*/
	remove(bundleName) {
		const len = bundles.length;
		for (let i = 0; i < len; i++) {
			if (!bundles[i]) continue;
			if (bundles[i].name === bundleName) bundles.splice(i, 1);
		}
	}
	handleChange(bundleName) {
		setTimeout(() => {
			this._handleChange(bundleName);
		}, 100);
	}
	/**
	* Resets the backoff timer used to avoid event thrashing when many files change rapidly.
	*/
	resetBackoffTimer() {
		clearTimeout(backoffTimer);
		backoffTimer = setTimeout(() => {
			backoffTimer = void 0;
			for (const bundleName of hasChanged) {
				log$5.debug("Backoff finished, emitting change event for", bundleName);
				this.handleChange(bundleName);
			}
			hasChanged.clear();
		}, 500);
	}
	/**
	* Checks if a given path is a panel HTML file of a given bundle.
	* @param bundleName {String}
	* @param filePath {String}
	* @returns {Boolean}
	* @private
	*/
	isPanelHTMLFile(bundleName, filePath) {
		const bundle = this.find(bundleName);
		if (bundle) return bundle.dashboard.panels.some((panel) => panel.path.endsWith(filePath));
		return false;
	}
	/**
	* Only used by tests.
	*/
	_stopWatching() {
		watcher.close();
	}
	_handleChange(bundleName) {
		const bundle = this.find(bundleName);
		/* istanbul ignore if: It's rare for `bundle` to be undefined here, but it can happen when using black/whitelisting. */
		if (!bundle) return;
		if (backoffTimer) {
			log$5.debug("Backoff active, delaying processing of change detected in", bundleName);
			hasChanged.add(bundleName);
			this.resetBackoffTimer();
		} else {
			log$5.debug("Processing change event for", bundleName);
			this.resetBackoffTimer();
			try {
				const reparsedBundle = parseBundle(bundle.dir, loadBundleCfg(this._cfgPath, bundle.name));
				this.add(reparsedBundle);
				this.emit("bundleChanged", reparsedBundle);
			} catch (error) {
				log$5.warn("Unable to handle the bundle \"%s\" change:\n%s", bundleName, error.stack);
				this.emit("invalidBundle", bundle, error);
			}
		}
	}
};
/**
* Checks if a given path is the manifest file for a given bundle.
* @param bundleName {String}
* @param filePath {String}
* @returns {Boolean}
* @private
*/
function isManifest(bundleName, filePath) {
	return node_path.default.dirname(filePath).endsWith(bundleName) && node_path.default.basename(filePath) === "package.json";
}
/**
* Checks if a given path is in the .git dir of a bundle.
* @param bundleName {String}
* @param filePath {String}
* @returns {Boolean}
* @private
*/
function isGitData(bundleName, filePath) {
	return (/* @__PURE__ */ new RegExp(`${bundleName}\\${node_path.default.sep}\\.git`)).test(filePath);
}
/**
* Determines which config file to use for a bundle.
*/
function loadBundleCfg(cfgDir, bundleName) {
	try {
		return (0, cosmiconfig.cosmiconfigSync)("nodecg", {
			searchPlaces: [
				`${bundleName}.json`,
				`${bundleName}.yaml`,
				`${bundleName}.yml`,
				`${bundleName}.js`,
				`${bundleName}.config.js`
			],
			stopDir: cfgDir
		}).search(cfgDir)?.config;
	} catch (_) {
		throw new Error(`Config for bundle "${bundleName}" could not be read. Ensure that it is valid JSON, YAML, or CommonJS.`);
	}
}
function getParentProjectName(changePath, rootPath) {
	if (rootPath !== changePath && !isChildPath(rootPath, changePath)) return false;
	const filePath = node_path.default.join(changePath, "package.json");
	try {
		const fileContent = node_fs.default.readFileSync(filePath, "utf-8");
		try {
			return JSON.parse(fileContent).name;
		} catch (error) {
			return false;
		}
	} catch (error) {
		const parentDir = node_path.default.join(changePath, "..");
		if (parentDir === changePath) return false;
		return getParentProjectName(parentDir, rootPath);
	}
}

//#endregion
//#region src/server/util/noop.ts
function noop() {}

//#endregion
//#region src/server/util/injectscripts.ts
/**
* Injects the appropriate assets into a panel, dialog, or graphic.
*/
function injectScripts(pathOrHtml, resourceType, { standalone = false, createApiInstance, sound = false } = {}, cb = noop) {
	if (resourceType === "graphic") fs.default.readFile(pathOrHtml, { encoding: "utf8" }, (error, data) => {
		inject(error ?? void 0, data);
	});
	else inject(void 0, pathOrHtml);
	function inject(err, html) {
		if (err) throw err;
		const $ = cheerio.default.load(html);
		const scripts = [];
		const styles = [];
		scripts.push(`<script>globalThis.ncgConfig = ${JSON.stringify(filteredConfig)};<\/script>`);
		if (resourceType === "panel" || resourceType === "dialog") {
			if (standalone && sound) scripts.push("<script src=\"/node_modules/soundjs/lib/soundjs.min.js\"><\/script>");
			if (standalone) scripts.push("<script src=\"/api.js\"><\/script>");
			else scripts.push("<script>window.NodeCG = window.top.NodeCG<\/script>");
			scripts.push("<link rel=\"stylesheet\" href=\"/dashboard/css/panel-and-dialog-defaults.css\">");
			if (standalone) scripts.push("<script src=\"/socket.js\"><\/script>");
			else scripts.push("<script>window.socket = window.top.socket;<\/script>");
			if (resourceType === "panel") {
				if (createApiInstance?.compatibleRange && semver.default.satisfies("1.0.0", createApiInstance.compatibleRange)) styles.push("<link rel=\"stylesheet\" href=\"/dashboard/css/old-panel-defaults.css\">");
				else styles.push("<link rel=\"stylesheet\" href=\"/dashboard/css/panel-defaults.css\">");
				scripts.push("<script async src=\"/dialog_opener.js\"><\/script>");
			} else if (resourceType === "dialog") styles.push("<link rel=\"stylesheet\" href=\"/dashboard/css/dialog-defaults.css\">");
		} else if (resourceType === "graphic") {
			if (sentryEnabled) scripts.unshift("<script src=\"/node_modules/@sentry/browser/build/bundle.es6.min.js\"><\/script>", "<script src=\"/sentry.js\"><\/script>");
			scripts.push("<script src=\"/socket.io/socket.io.js\"><\/script>");
			scripts.push("<script src=\"/socket.js\"><\/script>");
			if (sound) scripts.push("<script src=\"/node_modules/soundjs/lib/soundjs.min.js\"><\/script>");
			scripts.push("<script src=\"/api.js\"><\/script>");
		}
		if (createApiInstance) {
			const partialBundle = {
				name: createApiInstance.name,
				config: createApiInstance.config,
				version: createApiInstance.version,
				git: createApiInstance.git,
				_hasSounds: sound
			};
			scripts.push(`<script>globalThis.nodecg = new globalThis.NodeCG(${JSON.stringify(partialBundle)}, globalThis.socket)<\/script>`);
		}
		if (resourceType === "graphic" && !(pathOrHtml.endsWith("busy.html") || pathOrHtml.endsWith("killed.html"))) scripts.push("<script src=\"/client_registration.js\"><\/script>");
		const concattedScripts = scripts.join("\n");
		const theirScriptsAndImports = $("script, link[rel=\"import\"]");
		if (theirScriptsAndImports.length > 0) theirScriptsAndImports.first().before(concattedScripts);
		else $("body").append(concattedScripts);
		if (styles.length > 0) {
			const concattedStyles = styles.join("\n");
			const headStyles = $("head").find("style, link[rel=\"stylesheet\"]");
			if (headStyles.length > 0) headStyles.first().before(concattedStyles);
			else $("head").append(concattedStyles);
		}
		cb($.html());
	}
}

//#endregion
//#region src/server/util/send-node-modules-file/index.ts
function recursivelyFindFileInNodeModules(startDir, limitDir, targetFilePath) {
	const fileFullPath = node_path.default.join(startDir, "node_modules", targetFilePath);
	if (isChildPath(limitDir, fileFullPath) && node_fs.default.existsSync(fileFullPath)) return fileFullPath;
	const parentDir = node_path.default.dirname(startDir);
	if (parentDir === startDir || limitDir !== parentDir && !isChildPath(limitDir, parentDir)) return;
	return recursivelyFindFileInNodeModules(parentDir, limitDir, targetFilePath);
}
function sendNodeModulesFile(startDir, limitDir, filePath, res, next) {
	const foundPath = recursivelyFindFileInNodeModules(startDir, limitDir, filePath);
	if (!foundPath) {
		res.sendStatus(404);
		return;
	}
	sendFile(limitDir, foundPath, res, next);
}

//#endregion
//#region src/server/dashboard/index.ts
const BUILD_PATH$1 = node_path.join(__nodecg_internal_util.rootPaths.nodecgInstalledPath, "dist/client");
var DashboardLib = class {
	app = (0, express.default)();
	dashboardContext = void 0;
	constructor(bundleManager) {
		const { app } = this;
		app.use(express.default.static(BUILD_PATH$1));
		app.use("/node_modules/:filePath(*)", (req, res, next) => {
			const startDir = __nodecg_internal_util.rootPaths.nodecgInstalledPath;
			const limitDir = __nodecg_internal_util.rootPaths.runtimeRootPath;
			const filePath = req.params.filePath;
			sendNodeModulesFile(startDir, limitDir, filePath, res, next);
		});
		app.get("/", (_, res) => {
			res.redirect("/dashboard/");
		});
		app.get("/dashboard", authCheck, (req, res) => {
			if (!req.url.endsWith("/")) {
				res.redirect("/dashboard/");
				return;
			}
			if (!this.dashboardContext) this.dashboardContext = getDashboardContext(bundleManager.all());
			res.render(node_path.join(__nodecg_internal_util.rootPaths.nodecgInstalledPath, "dist/server/templates/dashboard.tmpl"), this.dashboardContext);
		});
		app.get("/bundles/:bundleName/dashboard/*", authCheck, (req, res, next) => {
			const { bundleName } = req.params;
			const bundle = bundleManager.find(bundleName);
			if (!bundle) {
				next();
				return;
			}
			const resName = req.params[0];
			const panel = bundle.dashboard.panels.find((p) => p.file === resName);
			if (panel) {
				const resourceType = panel.dialog ? "dialog" : "panel";
				injectScripts(panel.html, resourceType, {
					createApiInstance: bundle,
					standalone: Boolean(req.query.standalone),
					fullbleed: panel.fullbleed,
					sound: bundle.soundCues && bundle.soundCues.length > 0
				}, (html) => res.send(html));
			} else {
				const parentDir = bundle.dashboard.dir;
				sendFile(parentDir, node_path.join(parentDir, resName), res, next);
			}
		});
		bundleManager.on("bundleChanged", () => {
			this.dashboardContext = void 0;
		});
	}
};
function getDashboardContext(bundles$1) {
	return {
		bundles: bundles$1.map((bundle) => {
			const cleanedBundle = (0, klona_json.klona)(bundle);
			if (cleanedBundle.dashboard.panels) cleanedBundle.dashboard.panels.forEach((panel) => {
				delete panel.html;
			});
			return cleanedBundle;
		}),
		publicConfig: filteredConfig,
		privateConfig: config,
		workspaces: parseWorkspaces(bundles$1),
		sentryEnabled
	};
}
function parseWorkspaces(bundles$1) {
	let defaultWorkspaceHasPanels = false;
	let otherWorkspacesHavePanels = false;
	const workspaces = [];
	const workspaceNames = /* @__PURE__ */ new Set();
	bundles$1.forEach((bundle) => {
		bundle.dashboard.panels.forEach((panel) => {
			if (panel.dialog) return;
			if (panel.fullbleed) {
				otherWorkspacesHavePanels = true;
				const workspaceName = `__nodecg_fullbleed__${bundle.name}_${panel.name}`;
				workspaces.push({
					name: workspaceName,
					label: panel.title,
					route: `fullbleed/${panel.name}`,
					fullbleed: true
				});
			} else if (panel.workspace === "default") defaultWorkspaceHasPanels = true;
			else {
				workspaceNames.add(panel.workspace);
				otherWorkspacesHavePanels = true;
			}
		});
	});
	workspaceNames.forEach((name) => {
		workspaces.push({
			name,
			label: name,
			route: `workspace/${name}`
		});
	});
	workspaces.sort((a, b) => a.label.localeCompare(b.label));
	if (defaultWorkspaceHasPanels || !otherWorkspacesHavePanels) workspaces.unshift({
		name: "default",
		label: otherWorkspacesHavePanels ? "Main Workspace" : "Workspace",
		route: ""
	});
	return workspaces;
}

//#endregion
//#region src/server/graphics/registration.ts
const BUILD_PATH = path.default.join(__nodecg_internal_util.rootPaths.nodecgInstalledPath, "dist/client/instance");
var RegistrationCoordinator = class {
	app = (0, express.default)();
	_instancesRep;
	_bundleManager;
	constructor(io, bundleManager, replicator) {
		this._bundleManager = bundleManager;
		const { app } = this;
		this._instancesRep = replicator.declare("graphics:instances", "nodecg", {
			schemaPath: path.default.join(__nodecg_internal_util.rootPaths.nodecgInstalledPath, "schemas/graphics%3Ainstances.json"),
			persistent: false,
			defaultValue: []
		});
		bundleManager.on("bundleChanged", this._updateInstanceStatuses.bind(this));
		bundleManager.on("gitChanged", this._updateInstanceStatuses.bind(this));
		io.on("connection", (socket) => {
			socket.on("graphic:registerSocket", (regRequest, cb) => {
				const { bundleName } = regRequest;
				let { pathName } = regRequest;
				if (pathName.endsWith(`/${bundleName}/graphics/`)) pathName += "index.html";
				const bundle = bundleManager.find(bundleName);
				/* istanbul ignore if: simple error trapping */
				if (!bundle) {
					cb(void 0, false);
					return;
				}
				const graphicManifest = this._findGraphicManifest({
					bundleName,
					pathName
				});
				/* istanbul ignore if: simple error trapping */
				if (!graphicManifest) {
					cb(void 0, false);
					return;
				}
				const existingSocketRegistration = this._findRegistrationBySocketId(socket.id);
				const existingPathRegistration = this._findOpenRegistrationByPathName(pathName);
				if (existingPathRegistration && graphicManifest.singleInstance) {
					if (existingPathRegistration.socketId === socket.id) {
						cb(void 0, true);
						return;
					}
					cb(void 0, !existingPathRegistration.open);
					return;
				}
				if (existingSocketRegistration) existingSocketRegistration.open = true;
				else {
					this._addRegistration({
						...regRequest,
						ipv4: socket.request.socket.remoteAddress,
						socketId: socket.id,
						singleInstance: Boolean(graphicManifest.singleInstance),
						potentiallyOutOfDate: calcBundleGitMismatch(bundle, regRequest) || calcBundleVersionMismatch(bundle, regRequest),
						open: true
					});
					if (graphicManifest.singleInstance) app.emit("graphicOccupied", pathName);
				}
				cb(void 0, true);
			});
			socket.on("graphic:queryAvailability", (pathName, cb) => {
				cb(void 0, !this._findOpenRegistrationByPathName(pathName));
			});
			socket.on("graphic:requestBundleRefresh", (bundleName, cb) => {
				if (!bundleManager.find(bundleName)) {
					cb(void 0, void 0);
					return;
				}
				io.emit("graphic:bundleRefresh", bundleName);
				cb(void 0, void 0);
			});
			socket.on("graphic:requestRefreshAll", (graphic, cb) => {
				io.emit("graphic:refreshAll", graphic);
				if (typeof cb === "function") cb(void 0, void 0);
			});
			socket.on("graphic:requestRefresh", (instance, cb) => {
				io.emit("graphic:refresh", instance);
				cb(void 0, void 0);
			});
			socket.on("graphic:requestKill", (instance, cb) => {
				io.emit("graphic:kill", instance);
				cb(void 0, void 0);
			});
			socket.on("disconnect", () => {
				const registration = this._findRegistrationBySocketId(socket.id);
				if (!registration) return;
				registration.open = false;
				if (registration.singleInstance) app.emit("graphicAvailable", registration.pathName);
				setTimeout(() => {
					this._removeRegistration(socket.id);
				}, 1e3);
			});
		});
		app.get("/instance/*", (req, res, next) => {
			const resName = req.path.split("/").slice(2).join("/");
			const fileLocation = path.default.join(BUILD_PATH, resName);
			if (resName.endsWith(".html") && isChildPath(BUILD_PATH, fileLocation)) if (fs.default.existsSync(fileLocation)) injectScripts(fileLocation, "graphic", {}, (html) => res.send(html));
			else next();
			else next();
		});
	}
	_addRegistration(registration) {
		this._instancesRep.value.push({
			...registration,
			open: true
		});
	}
	_removeRegistration(socketId) {
		const registrationIndex = this._instancesRep.value.findIndex((instance) => instance.socketId === socketId);
		/* istanbul ignore next: simple error trapping */
		if (registrationIndex < 0) return false;
		return this._instancesRep.value.splice(registrationIndex, 1)[0];
	}
	_findRegistrationBySocketId(socketId) {
		return this._instancesRep.value.find((instance) => instance.socketId === socketId);
	}
	_findOpenRegistrationByPathName(pathName) {
		return this._instancesRep.value.find((instance) => instance.pathName === pathName && instance.open);
	}
	_updateInstanceStatuses() {
		this._instancesRep.value.forEach((instance) => {
			const { bundleName, pathName } = instance;
			const bundle = this._bundleManager.find(bundleName);
			/* istanbul ignore next: simple error trapping */
			if (!bundle) return;
			const graphicManifest = this._findGraphicManifest({
				bundleName,
				pathName
			});
			/* istanbul ignore next: simple error trapping */
			if (!graphicManifest) return;
			instance.potentiallyOutOfDate = calcBundleGitMismatch(bundle, instance) || calcBundleVersionMismatch(bundle, instance);
			instance.singleInstance = Boolean(graphicManifest.singleInstance);
		});
	}
	_findGraphicManifest({ pathName, bundleName }) {
		const bundle = this._bundleManager.find(bundleName);
		/* istanbul ignore if: simple error trapping */
		if (!bundle) return;
		return bundle.graphics.find((graphic) => graphic.url === pathName);
	}
};
function calcBundleGitMismatch(bundle, regRequest) {
	if (regRequest.bundleGit && !bundle.git) return true;
	if (!regRequest.bundleGit && bundle.git) return true;
	if (!regRequest.bundleGit && !bundle.git) return false;
	return regRequest.bundleGit.hash !== bundle.git.hash;
}
function calcBundleVersionMismatch(bundle, regRequest) {
	return bundle.version !== regRequest.bundleVersion;
}

//#endregion
//#region src/server/graphics/index.ts
var GraphicsLib = class {
	app = (0, express.default)();
	constructor(io, bundleManager, replicator) {
		const { app } = this;
		app.use(new RegistrationCoordinator(io, bundleManager, replicator).app);
		app.get("/bundles/:bundleName/graphics*", authCheck, (req, res, next) => {
			const { bundleName } = req.params;
			const bundle = bundleManager.find(bundleName);
			if (!bundle) {
				next();
				return;
			}
			let resName = "index.html";
			if (req.path.endsWith(`/${bundleName}/graphics`)) {
				res.redirect(`${req.url}/`);
				return;
			}
			if (!req.path.endsWith(`/${bundleName}/graphics/`)) resName = req.params[0];
			let isGraphic = false;
			bundle.graphics.some((graphic) => {
				if (`/${graphic.file}` === resName || graphic.file === resName) {
					isGraphic = true;
					return true;
				}
				return false;
			});
			const parentDir = node_path.default.join(bundle.dir, "graphics");
			const fileLocation = node_path.default.join(parentDir, resName);
			if (isGraphic) injectScripts(fileLocation, "graphic", {
				createApiInstance: bundle,
				sound: bundle.soundCues && bundle.soundCues.length > 0
			}, (html) => res.send(html));
			else sendFile(parentDir, fileLocation, res, next);
		});
		app.get("/bundles/:bundleName/bower_components/:filePath(*)", (req, res, next) => {
			const { bundleName } = req.params;
			const bundle = bundleManager.find(bundleName);
			if (!bundle) {
				next();
				return;
			}
			const resName = req.params.filePath;
			const parentDir = node_path.default.join(bundle.dir, "bower_components");
			sendFile(parentDir, node_path.default.join(parentDir, resName), res, next);
		});
		app.get("/bundles/:bundleName/node_modules/:filePath(*)", async (req, res, next) => {
			const { bundleName } = req.params;
			if (!bundleName) {
				next();
				return;
			}
			const bundle = bundleManager.find(bundleName);
			if (!bundle) {
				next();
				return;
			}
			const filePath = req.params.filePath;
			if ((0, __nodecg_internal_util.isLegacyProject)()) {
				const parentDir = node_path.default.join(bundle.dir, "node_modules");
				sendFile(parentDir, node_path.default.join(parentDir, filePath), res, next);
			} else try {
				if (JSON.parse(await node_fs.default.promises.readFile(node_path.default.join(__nodecg_internal_util.rootPaths.runtimeRootPath, "package.json"), "utf-8")).name === bundleName) sendNodeModulesFile(bundle.dir, __nodecg_internal_util.rootPaths.runtimeRootPath, filePath, res, next);
				else sendNodeModulesFile(bundle.dir, bundle.dir, filePath, res, next);
			} catch (error) {
				next(error);
			}
		});
	}
};

//#endregion
//#region src/types/socket-protocol.ts
let UnAuthErrCode = /* @__PURE__ */ function(UnAuthErrCode$1) {
	UnAuthErrCode$1["CredentialsBadFormat"] = "credentials_bad_format";
	UnAuthErrCode$1["CredentialsRequired"] = "credentials_required";
	UnAuthErrCode$1["InternalError"] = "internal_error";
	UnAuthErrCode$1["InvalidToken"] = "invalid_token";
	UnAuthErrCode$1["TokenRevoked"] = "token_invalidated";
	UnAuthErrCode$1["InvalidSession"] = "invalid_session";
	return UnAuthErrCode$1;
}({});

//#endregion
//#region src/server/login/UnauthorizedError.ts
var UnauthorizedError = class extends Error {
	serialized;
	constructor(code, message) {
		super(message);
		this.message = message;
		this.serialized = {
			message: this.message,
			code,
			type: "UnauthorizedError"
		};
	}
};

//#endregion
//#region src/server/login/socketAuthMiddleware.ts
const log$4 = createLogger("socket-auth");
const socketsByKey = /* @__PURE__ */ new Map();
const createSocketAuthMiddleware = (db) => {
	return async function socketAuthMiddleware(socket, next) {
		try {
			const { token } = socket.handshake.query;
			if (!token) {
				next(new UnauthorizedError(UnAuthErrCode.InvalidToken, "no token provided"));
				return;
			}
			if (Array.isArray(token)) {
				next(new UnauthorizedError(UnAuthErrCode.InvalidToken, "more than one token provided"));
				return;
			}
			const apiKey = await db.findApiKey(token);
			if (!apiKey) {
				next(new UnauthorizedError(UnAuthErrCode.CredentialsRequired, "no credentials found"));
				return;
			}
			const user = await db.findUser(apiKey.user.id);
			if (!user) {
				next(new UnauthorizedError(UnAuthErrCode.CredentialsRequired, "no user associated with provided credentials"));
				return;
			}
			const provider = user.identities[0].provider_type;
			const providerAllowed = config.login.enabled && config.login?.[provider]?.enabled;
			const allowed = db.isSuperUser(user) && providerAllowed;
			if (allowed) {
				if (!socketsByKey.has(token)) socketsByKey.set(token, /* @__PURE__ */ new Set());
				const socketSet = socketsByKey.get(token);
				/* istanbul ignore next: should be impossible */
				if (!socketSet) throw new Error("socketSet was somehow falsey");
				socketSet.add(socket);
				socket.on("regenerateToken", async (cb) => {
					try {
						const keyToDelete = await db.findApiKey(token);
						if (keyToDelete) {
							const newApiKey = await db.createApiKey();
							const user$1 = await db.findUser(keyToDelete.user.id);
							if (!user$1) throw new Error("should have been a user here");
							user$1.apiKeys = user$1.apiKeys.filter((ak) => ak.secret_key !== token);
							user$1.apiKeys.push(newApiKey);
							await db.saveUser(user$1);
							await db.deleteSecretKey(token);
							if (cb) cb(void 0, void 0);
						} else {
							if (cb) cb(void 0, void 0);
							socket.disconnect(true);
						}
						for (const s of socketSet) {
							if (s === socket) continue;
							s.emit("protocol_error", new UnauthorizedError(UnAuthErrCode.TokenRevoked, "This token has been invalidated").serialized);
							setTimeout(() => {
								s.disconnect(true);
							}, 500);
						}
						socketsByKey.delete(token);
					} catch (error) {
						log$4.error((0, serialize_error.serializeError)(error));
						if (cb) cb(error, void 0);
					}
				});
				socket.on("disconnect", () => {
					socketSet.delete(socket);
				});
			}
			if (allowed) next(void 0);
			else next(new UnauthorizedError(UnAuthErrCode.InvalidToken, "user is not allowed"));
		} catch (error) {
			next(error);
		}
	};
};

//#endregion
//#region src/server/mounts.ts
var MountsLib = class {
	app = (0, express.default)();
	constructor(bundles$1) {
		bundles$1.forEach((bundle) => {
			bundle.mount.forEach((mount) => {
				this.app.get(`/bundles/${bundle.name}/${mount.endpoint}/*`, authCheck, (req, res, next) => {
					const resName = req.params[0];
					const parentDir = path.default.join(bundle.dir, mount.directory);
					sendFile(parentDir, path.default.join(parentDir, resName), res, next);
				});
			});
		});
	}
};

//#endregion
//#region src/server/util/throttle-name.ts
const timers = /* @__PURE__ */ new Map();
const queued = /* @__PURE__ */ new Set();
/**
* A standard throttle, but uses a string `name` as the key instead of the callback.
*/
function throttleName(name, callback, duration = 500) {
	if (timers.get(name)) {
		queued.add(name);
		return;
	}
	callback();
	timers.set(name, setTimeout(() => {
		timers.delete(name);
		if (queued.has(name)) {
			queued.delete(name);
			callback();
		}
	}, duration));
}

//#endregion
//#region src/shared/utils/isBrowser.ts
function isBrowser() {
	return typeof globalThis.window !== "undefined";
}
function isWorker() {
	return typeof globalThis.WorkerGlobalScope !== "undefined" && self instanceof globalThis.WorkerGlobalScope;
}

//#endregion
//#region src/shared/replicants.shared.ts
/**
* If you're wondering why some things are prefixed with "_",
* but not marked as protected or private, this is because our Proxy
* trap handlers need to access these parts of the Replicant internals,
* but don't have access to private or protected members.
*
* So, we code this like its 2010 and just use "_" on some public members.
*/
var AbstractReplicant = class extends TypedEmitter {
	name;
	namespace;
	opts;
	revision = 0;
	log;
	schema;
	schemaSum;
	status = "undeclared";
	validationErrors = [];
	_value;
	_oldValue;
	_operationQueue = [];
	_pendingOperationFlush = false;
	constructor(name, namespace, opts = {}) {
		super();
		if (!name || typeof name !== "string") throw new Error("Must supply a name when instantiating a Replicant");
		if (!namespace || typeof namespace !== "string") throw new Error("Must supply a namespace when instantiating a Replicant");
		if (typeof opts.persistent === "undefined") opts.persistent = true;
		if (typeof opts.persistenceInterval === "undefined") opts.persistenceInterval = DEFAULT_PERSISTENCE_INTERVAL;
		this.name = name;
		this.namespace = namespace;
		this.opts = opts;
		const originalOnce = this.once.bind(this);
		this.once = (event, listener) => {
			if (event === "change" && this.status === "declared") {
				listener(this.value);
				return;
			}
			return originalOnce(event, listener);
		};
		/**
		* When a new "change" listener is added, chances are that the developer wants it to be initialized ASAP.
		* However, if this replicant has already been declared previously in this context, their "change"
		* handler will *not* get run until another change comes in, which may never happen for Replicants
		* that change very infrequently.
		* To resolve this, we immediately invoke all new "change" handlers if appropriate.
		*/
		this.on("newListener", (event, listener) => {
			if (event === "change" && this.status === "declared") listener(this.value);
		});
	}
	/**
	* If the operation is an array mutator method, call it on the target array with the operation arguments.
	* Else, handle it with objectPath.
	*/
	_applyOperation(operation) {
		ignoreProxy(this);
		let result;
		const path$13 = pathStrToPathArr(operation.path);
		if (ARRAY_MUTATOR_METHODS.includes(operation.method)) {
			if (typeof this.value !== "object" || this.value === null) throw new Error(`expected replicant "${this.namespace}:${this.name}" to have a value with type "object", got "${typeof this.value}" instead`);
			const arr = object_path.default.get(this.value, path$13);
			if (!Array.isArray(arr)) throw new Error(`expected to find an array in replicant "${this.namespace}:${this.name}" at path "${operation.path}"`);
			result = arr[operation.method].apply(arr, "args" in operation && "mutatorArgs" in operation.args ? operation.args.mutatorArgs : []);
			proxyRecursive(this, arr, operation.path);
		} else switch (operation.method) {
			case "overwrite": {
				const { newValue } = operation.args;
				this[isBrowser() || isWorker() ? "value" : "_value"] = proxyRecursive(this, newValue, operation.path);
				result = true;
				break;
			}
			case "add":
			case "update": {
				path$13.push(operation.args.prop);
				let { newValue } = operation.args;
				if (typeof newValue === "object") newValue = proxyRecursive(this, newValue, pathArrToPathStr(path$13));
				result = object_path.default.set(this.value, path$13, newValue);
				break;
			}
			case "delete":
				if (path$13.length === 0 || object_path.default.has(this.value, path$13)) {
					const target = object_path.default.get(this.value, path$13);
					result = delete target[operation.args.prop];
				}
				break;
			default:
 /* istanbul ignore next */
			throw new Error(`Unexpected operation method "${operation.method}"`);
		}
		resumeProxy(this);
		return result;
	}
	/**
	* Used to validate the new value of a replicant.
	*
	* This is a stub that will be replaced if a Schema is available.
	*/
	validate = () => true;
	/**
	* Generates a JSON Schema validator function from the `schema` property of the provided replicant.
	* @param replicant {object} - The Replicant to perform the operation on.
	* @returns {function} - The generated validator function.
	*/
	_generateValidator() {
		const { schema } = this;
		if (!schema) throw new Error("can't generate a validator for a replicant which lacks a schema");
		let validate;
		try {
			validate = compileJsonSchema(schema);
		} catch (error) {
			throw new Error(`Error compiling JSON Schema for Replicant "${this.namespace}:${this.name}":\n\t${stringifyError(error)}`);
		}
		/**
		* Validates a value against the current Replicant's schema.
		* Throws when the value fails validation.
		* @param [value=replicant.value] {*} - The value to validate. Defaults to the replicant's current value.
		* @param [opts] {Object}
		* @param [opts.throwOnInvalid = true] {Boolean} - Whether or not to immediately throw when the provided value fails validation against the schema.
		*/
		return function(value = this.value, { throwOnInvalid = true } = {}) {
			const valid = validate(value);
			if (!valid) {
				this.validationErrors = validate.errors;
				if (throwOnInvalid) throw new Error(`Invalid value rejected for replicant "${this.name}" in namespace "${this.namespace}":\n${formatJsonSchemaErrors(schema, validate.errors)}`);
			}
			return valid;
		};
	}
};
const proxyMetadataMap = /* @__PURE__ */ new WeakMap();
const metadataMap = /* @__PURE__ */ new WeakMap();
const proxySet = /* @__PURE__ */ new WeakSet();
const ignoringProxy = /* @__PURE__ */ new WeakSet();
const ARRAY_MUTATOR_METHODS = [
	"copyWithin",
	"fill",
	"pop",
	"push",
	"reverse",
	"shift",
	"sort",
	"splice",
	"unshift"
];
/**
* The default persistence interval, in milliseconds.
*/
const DEFAULT_PERSISTENCE_INTERVAL = 100;
function ignoreProxy(replicant) {
	ignoringProxy.add(replicant);
}
function resumeProxy(replicant) {
	ignoringProxy.delete(replicant);
}
function isIgnoringProxy(replicant) {
	return ignoringProxy.has(replicant);
}
const deleteTrap = function(target, prop) {
	const metadata = metadataMap.get(target);
	if (!metadata) throw new Error("arrived at delete trap without any metadata");
	const { replicant } = metadata;
	if (isIgnoringProxy(replicant)) return delete target[prop];
	if (!{}.hasOwnProperty.call(target, prop)) return true;
	if (replicant.schema) {
		const valueClone = (0, klona_json.klona)(replicant.value);
		const targetClone = object_path.default.get(valueClone, pathStrToPathArr(metadata.path));
		delete targetClone[prop];
		replicant.validate(valueClone);
	}
	replicant._addOperation({
		path: metadata.path,
		method: "delete",
		args: { prop }
	});
	if (!isBrowser() && !isWorker()) return delete target[prop];
};
const CHILD_ARRAY_HANDLER = {
	get(target, prop) {
		const metadata = metadataMap.get(target);
		if (!metadata) throw new Error("arrived at get trap without any metadata");
		const { replicant } = metadata;
		if (isIgnoringProxy(replicant)) return target[prop];
		if ({}.hasOwnProperty.call(Array.prototype, prop) && typeof Array.prototype[prop] === "function" && target[prop] === Array.prototype[prop] && ARRAY_MUTATOR_METHODS.includes(prop)) return (...args) => {
			if (replicant.schema) {
				const valueClone = (0, klona_json.klona)(replicant.value);
				const targetClone = object_path.default.get(valueClone, pathStrToPathArr(metadata.path));
				targetClone[prop].apply(targetClone, args);
				replicant.validate(valueClone);
			}
			if (isBrowser() || isWorker()) metadata.replicant._addOperation({
				path: metadata.path,
				method: prop,
				args: { mutatorArgs: Array.prototype.slice.call(args) }
			});
			else {
				ignoreProxy(replicant);
				metadata.replicant._addOperation({
					path: metadata.path,
					method: prop,
					args: { mutatorArgs: Array.prototype.slice.call(args) }
				});
				const retValue = target[prop].apply(target, args);
				resumeProxy(replicant);
				proxyRecursive(replicant, target, metadata.path);
				return retValue;
			}
		};
		return target[prop];
	},
	set(target, prop, newValue) {
		if (target[prop] === newValue) return true;
		const metadata = metadataMap.get(target);
		if (!metadata) throw new Error("arrived at set trap without any metadata");
		const { replicant } = metadata;
		if (isIgnoringProxy(replicant)) {
			target[prop] = newValue;
			return true;
		}
		if (replicant.schema) {
			const valueClone = (0, klona_json.klona)(replicant.value);
			const targetClone = object_path.default.get(valueClone, pathStrToPathArr(metadata.path));
			targetClone[prop] = newValue;
			replicant.validate(valueClone);
		}
		if ({}.hasOwnProperty.call(target, prop)) replicant._addOperation({
			path: metadata.path,
			method: "update",
			args: {
				prop,
				newValue
			}
		});
		else replicant._addOperation({
			path: metadata.path,
			method: "add",
			args: {
				prop,
				newValue
			}
		});
		if (!isBrowser() && !isWorker()) target[prop] = proxyRecursive(metadata.replicant, newValue, joinPathParts(metadata.path, prop));
		return true;
	},
	deleteProperty: deleteTrap
};
const CHILD_OBJECT_HANDLER = {
	get(target, prop) {
		const value = target[prop];
		const tag = Object.prototype.toString.call(value);
		if (prop !== "constructor" && (tag === "[object Function]" || tag === "[object AsyncFunction]" || tag === "[object GeneratorFunction]")) return value.bind(target);
		return value;
	},
	set(target, prop, newValue) {
		if (target[prop] === newValue) return true;
		const metadata = metadataMap.get(target);
		if (!metadata) throw new Error("arrived at set trap without any metadata");
		const { replicant } = metadata;
		if (isIgnoringProxy(replicant)) {
			target[prop] = newValue;
			return true;
		}
		if (replicant.schema) {
			const valueClone = (0, klona_json.klona)(replicant.value);
			const targetClone = object_path.default.get(valueClone, pathStrToPathArr(metadata.path));
			targetClone[prop] = newValue;
			replicant.validate(valueClone);
		}
		if ({}.hasOwnProperty.call(target, prop)) replicant._addOperation({
			path: metadata.path,
			method: "update",
			args: {
				prop,
				newValue
			}
		});
		else replicant._addOperation({
			path: metadata.path,
			method: "add",
			args: {
				prop,
				newValue
			}
		});
		if (!isBrowser() && !isWorker()) target[prop] = proxyRecursive(metadata.replicant, newValue, joinPathParts(metadata.path, prop));
		return true;
	},
	deleteProperty: deleteTrap
};
/**
* Recursively Proxies an Array or Object. Does nothing to primitive values.
* @param replicant {object} - The Replicant in which to do the work.
* @param value {*} - The value to recursively Proxy.
* @param path {string} - The objectPath to this value.
* @returns {*} - The recursively Proxied value (or just `value` unchanged, if `value` is a primitive)
* @private
*/
function proxyRecursive(replicant, value, path$13) {
	if (typeof value === "object" && value !== null) {
		let p;
		assertSingleOwner(replicant, value);
		if (proxySet.has(value)) {
			p = value;
			const metadata = proxyMetadataMap.get(value);
			metadata.path = path$13;
		} else if (metadataMap.has(value)) {
			const metadata = metadataMap.get(value);
			if (!metadata) throw new Error("metadata unexpectedly not found");
			p = metadata.proxy;
			metadata.path = path$13;
		} else {
			const handler = Array.isArray(value) ? CHILD_ARRAY_HANDLER : CHILD_OBJECT_HANDLER;
			p = new Proxy(value, handler);
			proxySet.add(p);
			const metadata = {
				replicant,
				path: path$13,
				proxy: p
			};
			metadataMap.set(value, metadata);
			proxyMetadataMap.set(p, metadata);
		}
		for (const key in value) {
			/* istanbul ignore if */
			if (!{}.hasOwnProperty.call(value, key)) continue;
			const escapedKey = key.replace(/\//g, "~1");
			if (path$13) {
				const joinedPath = joinPathParts(path$13, escapedKey);
				value[key] = proxyRecursive(replicant, value[key], joinedPath);
			} else value[key] = proxyRecursive(replicant, value[key], escapedKey);
		}
		return p;
	}
	return value;
}
function joinPathParts(part1, part2) {
	return part1.endsWith("/") ? `${part1}${part2}` : `${part1}/${part2}`;
}
/**
* Converts a string path (/a/b/c) to an array path ['a', 'b', 'c']
* @param path {String} - The path to convert.
* @returns {Array} - The converted path.
*/
function pathStrToPathArr(path$13) {
	const pathArr = path$13.substr(1).split("/").map((part) => part.replace(/~1/g, "/"));
	if (pathArr.length === 1 && pathArr[0] === "") return [];
	return pathArr;
}
/**
* Converts an array path ['a', 'b', 'c'] to a string path /a/b/c)
* @param path {Array} - The path to convert.
* @returns {String} - The converted path.
*/
function pathArrToPathStr(path$13) {
	const strPath = path$13.join("/");
	if (!strPath.startsWith("/")) return `/${strPath}`;
	return strPath;
}
/**
* Throws an exception if an object belongs to more than one Replicant.
* @param replicant {object} - The Replicant that this value should belong to.
* @param value {*} - The value to check ownership of.
*/
function assertSingleOwner(replicant, value) {
	let metadata;
	if (proxySet.has(value)) metadata = proxyMetadataMap.get(value);
	else if (metadataMap.has(value)) metadata = metadataMap.get(value);
	else return;
	if (metadata.replicant !== replicant) throw new Error(`This object belongs to another Replicant, ${metadata.replicant.namespace}::${metadata.replicant.name}.\nA given object cannot belong to multiple Replicants. Object value:\n${JSON.stringify(value, null, 2)}`);
}

//#endregion
//#region src/server/replicant/schema-hacks.ts
function stripHash(url) {
	const hashIndex = url.indexOf("#");
	if (hashIndex >= 0) return url.slice(0, hashIndex);
	return url;
}
function typeOf(value) {
	const type = {
		hasValue: false,
		isArray: false,
		isPOJO: false,
		isNumber: false
	};
	if (typeof value !== "undefined" && value !== null) {
		type.hasValue = true;
		if (typeof value === "number") type.isNumber = !isNaN(value);
		else if (Array.isArray(value)) type.isArray = true;
		else type.isPOJO = typeof value === "object" && !(value instanceof RegExp) && !(value instanceof Date);
	}
	return type;
}
/**
* Mutates an object in place, replacing all its JSON Refs with their dereferenced values.
*/
function replaceRefs(inputObj, currentFile, allFiles) {
	const type = typeOf(inputObj);
	if (!type.isPOJO && !type.isArray) return;
	const obj = inputObj;
	if (type.isPOJO) {
		let dereferencedData;
		let referenceFile;
		if (isFileReference(obj)) {
			const referenceUrl = resolveFileReference(obj.$ref, currentFile);
			referenceFile = allFiles.find((file) => file.url === referenceUrl);
			/* istanbul ignore next: in theory this isn't possible */
			if (!referenceFile) throw new Error("Should have been a schema here but wasn't");
			dereferencedData = referenceFile.data;
			const hashIndex = obj.$ref.indexOf("#");
			if (hashIndex >= 0) {
				const hashPath = obj.$ref.slice(hashIndex);
				dereferencedData = resolvePointerReference(dereferencedData, hashPath);
			}
		} else if (isPointerReference(obj)) {
			referenceFile = currentFile;
			dereferencedData = resolvePointerReference(currentFile.data, obj.$ref);
		}
		if (dereferencedData && referenceFile) {
			delete obj.$ref;
			for (const key in dereferencedData) {
				if (key === "$schema") continue;
				obj[key] = (0, klona_json.klona)(dereferencedData[key]);
			}
			const keys$1 = Object.keys(dereferencedData);
			for (let i = 0; i < keys$1.length; i++) {
				const value = obj[keys$1[i]];
				replaceRefs(value, referenceFile, allFiles);
			}
		}
	}
	const keys = Object.keys(obj);
	for (let i = 0; i < keys.length; i++) {
		const value = obj[keys[i]];
		replaceRefs(value, currentFile, allFiles);
	}
	return obj;
}
/**
* Determines whether the given value is a JSON Reference that points to a file
* (as opposed to an internal reference, which points to a location within its own file).
*
* @param {*} value - The value to inspect
* @returns {boolean}
*/
function isFileReference(value) {
	return typeof value.$ref === "string" && !value.$ref.startsWith("#");
}
/**
* Determines whether the given value is a JSON Pointer to another value in the same file.
*
* @param {*} value - The value to inspect
* @returns {boolean}
*/
function isPointerReference(value) {
	return typeof value.$ref === "string" && value.$ref.startsWith("#");
}
/**
* Resolves the given JSON Reference URL against the specified file, and adds a new {@link File}
* object to the schema if necessary.
*
* @param {string} url - The JSON Reference URL (may be absolute or relative)
* @param {File} file - The file that the JSON Reference is in
*/
function resolveFileReference(url, file) {
	const { schema } = file;
	url = stripHash(url);
	return schema.plugins.resolveURL({
		from: file.url,
		to: url
	});
}
function resolvePointerReference(obj, ref) {
	return json_ptr.JsonPointer.get(obj, ref);
}
function formatSchema(inputObj, currentFile, allFiles) {
	const schema = replaceRefs(inputObj, currentFile, allFiles);
	/**
	* NodeCG's CLI uses `json-schema-to-typescript` to convert JSON schemas into TypeScript types with the ability to override the generated type (https://github.com/bcherny/json-schema-to-typescript#custom-schema-properties), which can be handy in certain situations.
	The problem is that these custom properties are not standard, and AJV will throw an error due to their presence.
	This ensures that the schema will be compliant by removing these custom properties and allowing the schema converter to customize the generated type if needed.
	*/
	if (schema) {
		delete schema.tsType;
		delete schema.tsEnumNames;
	}
	return schema;
}

//#endregion
//#region src/server/replicant/server-replicant.ts
/**
* Never instantiate this directly.
* Always use Replicator.declare instead.
* The Replicator needs to have complete control over the ServerReplicant class.
*/
var ServerReplicant = class extends AbstractReplicant {
	constructor(name, namespace, opts = {}, startingValue = void 0) {
		super(name, namespace, opts);
		/**
		* Server Replicants are immediately considered declared.
		* Client Replicants aren't considered declared until they have
		* fetched the current value from the server, which is an
		* async operation that takes time.
		*/
		this.status = "declared";
		this.log = createLogger(`Replicant/${namespace}.${name}`);
		function getBundlePath() {
			const rootPath = __nodecg_internal_util.rootPaths.runtimeRootPath;
			if ((0, __nodecg_internal_util.isLegacyProject)()) return node_path.join(__nodecg_internal_util.rootPaths.getRuntimeRoot(), "bundles", namespace);
			const rootPackageJson = node_fs.readFileSync(node_path.join(rootPath, "package.json"), "utf-8");
			if (JSON.parse(rootPackageJson).name === namespace) return rootPath;
			else {
				const bundlesDir = node_path.join(rootPath, "bundles");
				if ((node_fs.existsSync(bundlesDir) ? node_fs.statSync(bundlesDir) : null)?.isDirectory()) {
					const bundles$1 = node_fs.readdirSync(node_path.join(rootPath, "bundles"), { withFileTypes: true });
					for (const bundleDir of bundles$1) {
						if (!bundleDir.isDirectory()) continue;
						const bundlePath = node_path.join(rootPath, "bundles", bundleDir.name);
						const bundlePackageJsonPath = node_path.join(bundlePath, "package.json");
						if (!node_fs.existsSync(bundlePackageJsonPath)) continue;
						const bundlePackageJson = node_fs.readFileSync(bundlePackageJsonPath, "utf-8");
						if (JSON.parse(bundlePackageJson).name === namespace) return bundlePath;
					}
				}
				return false;
			}
		}
		let absoluteSchemaPath;
		const schemaPath = opts.schemaPath;
		if (schemaPath) if (node_path.isAbsolute(schemaPath)) absoluteSchemaPath = schemaPath;
		else absoluteSchemaPath = node_path.join(__nodecg_internal_util.rootPaths.getRuntimeRoot(), schemaPath);
		else {
			const bundlePath = getBundlePath();
			if (bundlePath) absoluteSchemaPath = node_path.join(bundlePath, "schemas", `${encodeURIComponent(name)}.json`);
		}
		if (absoluteSchemaPath && node_fs.existsSync(absoluteSchemaPath)) try {
			const rawSchema = __nodecg_json_schema_lib.default.readSync(absoluteSchemaPath);
			const parsedSchema = formatSchema(rawSchema.root, rawSchema.rootFile, rawSchema.files);
			if (!parsedSchema) throw new Error("parsed schema was unexpectedly undefined");
			this.schema = parsedSchema;
			this.schemaSum = (0, hasha.default)(JSON.stringify(parsedSchema), { algorithm: "sha1" });
			this.validate = this._generateValidator();
		} catch (e) {
			if (!process.env.NODECG_TEST) this.log.error("Schema could not be loaded, are you sure that it is valid JSON?\n", e.stack);
		}
		let defaultValue = "defaultValue" in opts ? opts.defaultValue : void 0;
		if (this.schema && defaultValue === void 0) defaultValue = getSchemaDefault(this.schema, `${this.namespace}:${this.name}`);
		if (opts.persistent && typeof startingValue !== "undefined" && startingValue !== null) {
			if (this.validate(startingValue, { throwOnInvalid: false })) {
				this._value = proxyRecursive(this, startingValue, "/");
				this.log.replicants("Loaded a persisted value:", startingValue);
			} else if (this.schema) {
				this._value = proxyRecursive(this, getSchemaDefault(this.schema, `${this.namespace}:${this.name}`), "/");
				this.log.replicants("Discarded persisted value, as it failed schema validation. Replaced with defaults from schema.");
			}
		} else {
			if (this.schema && defaultValue !== void 0) this.validate(defaultValue);
			if (defaultValue === void 0) this.log.replicants("Declared \"%s\" in namespace \"%s\"\n", name, namespace);
			else {
				this._value = proxyRecursive(this, (0, klona_json.klona)(defaultValue), "/");
				this.log.replicants("Declared \"%s\" in namespace \"%s\" with defaultValue:\n", name, namespace, defaultValue);
			}
		}
	}
	get value() {
		return this._value;
	}
	set value(newValue) {
		if (newValue === this._value) {
			this.log.replicants("value unchanged, no action will be taken");
			return;
		}
		this.validate(newValue);
		this.log.replicants("running setter with", newValue);
		const clonedNewVal = (0, klona_json.klona)(newValue);
		this._addOperation({
			path: "/",
			method: "overwrite",
			args: { newValue: clonedNewVal }
		});
		ignoreProxy(this);
		this._value = proxyRecursive(this, newValue, "/");
		resumeProxy(this);
	}
	/**
	* Refer to the abstract base class' implementation for details.
	* @private
	*/
	_addOperation(operation) {
		this._operationQueue.push(operation);
		if (!this._pendingOperationFlush) {
			this._oldValue = (0, klona_json.klona)(this.value);
			this._pendingOperationFlush = true;
			process.nextTick(() => {
				this._flushOperations();
			});
		}
	}
	/**
	* Refer to the abstract base class' implementation for details.
	* @private
	*/
	_flushOperations() {
		this._pendingOperationFlush = false;
		if (this._operationQueue.length <= 0) return;
		this.revision++;
		this.emit("operations", {
			name: this.name,
			namespace: this.namespace,
			operations: this._operationQueue,
			revision: this.revision
		});
		const opQ = this._operationQueue;
		this._operationQueue = [];
		this.emit("change", this.value, this._oldValue, opQ);
	}
};

//#endregion
//#region src/server/replicant/replicator.ts
const log$3 = createLogger("replicator");
var Replicator = class {
	declaredReplicants = /* @__PURE__ */ new Map();
	_uuid = (0, node_crypto.randomUUID)();
	_repEntities;
	_pendingSave = /* @__PURE__ */ new WeakMap();
	constructor(io, db, repEntities) {
		this.io = io;
		this.db = db;
		this.io = io;
		io.on("connection", (socket) => {
			this._attachToSocket(socket);
		});
		this._repEntities = repEntities;
	}
	declare(name, namespace, opts) {
		const nsp = this.declaredReplicants.get(namespace);
		if (nsp) {
			const existing = nsp.get(name);
			if (existing) {
				existing.log.replicants("Existing replicant found, returning that instead of creating a new one.");
				return existing;
			}
		} else this.declaredReplicants.set(namespace, /* @__PURE__ */ new Map());
		let parsedPersistedValue;
		const repEnt = this._repEntities.find((re) => re.namespace === namespace && re.name === name);
		if (repEnt) try {
			parsedPersistedValue = repEnt.value === "" ? void 0 : JSON.parse(repEnt.value);
		} catch (_) {
			parsedPersistedValue = repEnt.value;
		}
		const rep = new ServerReplicant(name, namespace, opts, parsedPersistedValue);
		this.declaredReplicants.get(namespace).set(name, rep);
		rep.on("change", () => {
			this.saveReplicant(rep);
		});
		rep.on("operations", (data) => {
			this.emitToClients(rep, "replicant:operations", data);
		});
		return rep;
	}
	/**
	* Applies an array of operations to a replicant.
	* @param replicant {object} - The Replicant to perform these operation on.
	* @param operations {array} - An array of operations.
	*/
	applyOperations(replicant, operations) {
		const oldValue = (0, klona_json.klona)(replicant.value);
		operations.forEach((operation) => replicant._applyOperation(operation));
		replicant.revision++;
		replicant.emit("change", replicant.value, oldValue, operations);
		this.emitToClients(replicant, "replicant:operations", {
			name: replicant.name,
			namespace: replicant.namespace,
			revision: replicant.revision,
			operations
		});
	}
	/**
	* Emits an event to all remote Socket.IO listeners.
	* @param namespace - The namespace in which to emit this event. Only applies to Socket.IO listeners.
	* @param eventName - The name of the event to emit.
	* @param data - The data to emit with the event.
	*/
	emitToClients(replicant, eventName, data) {
		const namespace = `replicant:${replicant.namespace}:${replicant.name}`;
		log$3.replicants("emitting %s to %s:", eventName, namespace, JSON.stringify(data, void 0, 2));
		this.io.to(namespace).emit(eventName, data);
	}
	saveAllReplicants() {
		for (const replicants of this.declaredReplicants.values()) for (const replicant of replicants.values()) this.saveReplicant(replicant);
	}
	async saveAllReplicantsNow() {
		const promises = [];
		for (const replicants of this.declaredReplicants.values()) for (const replicant of replicants.values()) promises.push(this._saveReplicant(replicant));
		await Promise.all(promises);
	}
	saveReplicant(replicant) {
		if (!replicant.opts.persistent) return;
		throttleName(`${this._uuid}:${replicant.namespace}:${replicant.name}`, () => {
			this._saveReplicant(replicant).catch((error) => {
				log$3.error("Error saving replicant:", error);
			});
		}, replicant.opts.persistenceInterval);
	}
	async _saveReplicant(replicant) {
		if (!replicant.opts.persistent) return;
		if (this._pendingSave.has(replicant)) return this._pendingSave.get(replicant);
		try {
			const promise = this.db.saveReplicant(replicant);
			this._pendingSave.set(replicant, promise);
			await promise;
		} catch (error) {
			replicant.log.error("Failed to persist value:", stringifyError(error));
		} finally {
			this._pendingSave.delete(replicant);
		}
	}
	_attachToSocket(socket) {
		socket.on("replicant:declare", (data, cb) => {
			log$3.replicants("received replicant:declare", JSON.stringify(data, void 0, 2));
			try {
				const replicant = this.declare(data.name, data.namespace, data.opts);
				cb(void 0, {
					value: replicant.value,
					revision: replicant.revision,
					schema: replicant.schema,
					schemaSum: replicant.schemaSum
				});
			} catch (e) {
				if (e.message.startsWith("Invalid value rejected for replicant")) cb(e.message, void 0);
				else throw e;
			}
		});
		socket.on("replicant:proposeOperations", (data, cb) => {
			log$3.replicants("received replicant:proposeOperations", JSON.stringify(data, void 0, 2));
			const serverReplicant = this.declare(data.name, data.namespace, data.opts);
			if (serverReplicant.schema && (!("schemaSum" in data) || data.schemaSum !== serverReplicant.schemaSum)) {
				log$3.replicants("Change request %s:%s had mismatched schema sum (ours %s, theirs %s), invoking callback with new schema and fullupdate", data.namespace, data.name, serverReplicant.schemaSum, "schemaSum" in data ? data.schemaSum : "(no schema)");
				cb("Mismatched schema version, assignment rejected", {
					schema: serverReplicant.schema,
					schemaSum: serverReplicant.schemaSum,
					value: serverReplicant.value,
					revision: serverReplicant.revision
				});
			} else if (serverReplicant.revision !== data.revision) {
				log$3.replicants("Change request %s:%s had mismatched revision (ours %s, theirs %s), invoking callback with fullupdate", data.namespace, data.name, serverReplicant.revision, data.revision);
				cb("Mismatched revision number, assignment rejected", {
					value: serverReplicant.value,
					revision: serverReplicant.revision
				});
			}
			this.applyOperations(serverReplicant, data.operations);
		});
		socket.on("replicant:read", (data, cb) => {
			log$3.replicants("replicant:read", JSON.stringify(data, void 0, 2));
			const replicant = this.declare(data.name, data.namespace);
			if (typeof cb === "function") if (replicant) cb(void 0, replicant.value);
			else cb(void 0, void 0);
		});
	}
};

//#endregion
//#region src/server/shared-sources.ts
var SharedSourcesLib = class {
	app = (0, express.default)();
	constructor(bundles$1) {
		this.app.get("/bundles/:bundleName/shared/*", authCheck, (req, res, next) => {
			const { bundleName } = req.params;
			const bundle = bundles$1.find((b) => b.name === bundleName);
			if (!bundle) {
				next();
				return;
			}
			const resName = req.params[0];
			const parentDir = path.default.join(bundle.dir, "shared");
			sendFile(parentDir, path.default.join(parentDir, resName), res, next);
		});
	}
};

//#endregion
//#region src/server/sounds.ts
var SoundsLib = class {
	app = (0, express.default)();
	_bundles;
	_cueRepsByBundle = /* @__PURE__ */ new Map();
	constructor(bundles$1, replicator) {
		this._bundles = bundles$1;
		replicator.declare("volume:master", "_sounds", { defaultValue: 100 });
		bundles$1.forEach((bundle) => {
			if (bundle.soundCues.length > 0) {
				const defaultCuesRepValue = this._makeCuesRepDefaultValue(bundle);
				const cuesRep = replicator.declare("soundCues", bundle.name, {
					schemaPath: node_path.join(__nodecg_internal_util.rootPaths.nodecgInstalledPath, "schemas/soundCues.json"),
					defaultValue: []
				});
				this._cueRepsByBundle.set(bundle.name, cuesRep);
				if (cuesRep.value.length > 0) {
					cuesRep.value = cuesRep.value.filter((persistedCue) => defaultCuesRepValue.find((defaultCue) => defaultCue.name === persistedCue.name));
					defaultCuesRepValue.forEach((defaultCue) => {
						const existingIndex = cuesRep.value.findIndex((persistedCue) => persistedCue.name === defaultCue.name);
						if (existingIndex >= 0) {
							cuesRep.value[existingIndex].assignable = defaultCue.assignable;
							cuesRep.value[existingIndex].defaultFile = defaultCue.defaultFile;
							if (!defaultCue.assignable && defaultCue.defaultFile) cuesRep.value[existingIndex].file = (0, klona_json.klona)(defaultCue.defaultFile);
						} else cuesRep.value.push(defaultCue);
					});
				} else cuesRep.value = defaultCuesRepValue;
				replicator.declare(`volume:${bundle.name}`, "_sounds", { defaultValue: 100 });
			}
		});
		this.app.get("/sound/:bundleName/:cueName/default.mp3", this._serveDefault.bind(this));
		this.app.get("/sound/:bundleName/:cueName/default.ogg", this._serveDefault.bind(this));
	}
	_serveDefault(req, res, next) {
		const bundle = this._bundles.find((b) => b.name === req.params.bundleName);
		if (!bundle) {
			res.status(404).send(`File not found: ${req.path}`);
			return;
		}
		const cue = bundle.soundCues.find((cue$1) => cue$1.name === req.params.cueName);
		if (!cue) {
			res.status(404).send(`File not found: ${req.path}`);
			return;
		}
		if (!cue.defaultFile) {
			res.status(404).send(`Cue "${cue.name}" had no default file`);
			return;
		}
		const parentDir = bundle.dir;
		sendFile(parentDir, node_path.join(parentDir, cue.defaultFile), res, next);
	}
	_makeCuesRepDefaultValue(bundle) {
		const formattedCues = [];
		for (const rawCue of bundle.soundCues) {
			let file;
			if (rawCue.defaultFile) {
				const filepath = node_path.join(bundle.dir, rawCue.defaultFile);
				const parsedPath = node_path.parse(filepath);
				file = {
					sum: hasha.default.fromFileSync(filepath, { algorithm: "sha1" }),
					base: parsedPath.base,
					ext: parsedPath.ext,
					name: parsedPath.name,
					url: `/sound/${bundle.name}/${rawCue.name}/default${parsedPath.ext}`,
					default: true
				};
			}
			const formatted = {
				name: rawCue.name,
				assignable: Boolean(rawCue.assignable),
				volume: rawCue.defaultVolume ?? 30
			};
			if ("defaultVolume" in rawCue) formatted.defaultVolume = rawCue.defaultVolume;
			if (file) {
				formatted.file = file;
				formatted.defaultFile = (0, klona_json.klona)(file);
			}
			formattedCues.push(formatted);
		}
		return formattedCues;
	}
};

//#endregion
//#region package.json
var require_package = /* @__PURE__ */ __commonJS({ "package.json": ((exports, module) => {
	module.exports = {
		"name": "nodecg",
		"version": "2.6.4",
		"description": "Dynamic broadcast graphics rendered in a browser",
		"keywords": [
			"graphics",
			"nodecg",
			"node",
			"dynamic",
			"broadcast"
		],
		"homepage": "https://nodecg.dev/",
		"bugs": "https://github.com/nodecg/nodecg/issues",
		"repository": {
			"type": "git",
			"url": "git+https://github.com/nodecg/nodecg.git",
			"directory": "workspaces/nodecg"
		},
		"license": "MIT",
		"type": "commonjs",
		"exports": {
			".": "./dist/server/bootstrap.js",
			"./types": { "types": "./types/index.d.ts" },
			"./types/augment-window": { "types": "./types/augment-window.d.ts" }
		},
		"main": "./dist/server/bootstrap.js",
		"bin": { "nodecg": "./cli.mjs" },
		"files": [
			"dist",
			"schemas",
			"src",
			"types",
			"cli.mjs",
			"index.js"
		],
		"scripts": {
			"build": "tsdown",
			"start": "node index.js",
			"test": "vitest",
			"typecheck": "tsc -p src -p test --noEmit",
			"typecheck-watch": "tsc -p src -p test --noEmit --watch --preserveWatchOutput",
			"typetest": "cd typetest/fake-bundle && npm run build",
			"watch": "tsdown --watch"
		},
		"dependencies": {
			"@effect/opentelemetry": "^0.59.1",
			"@effect/platform": "^0.93.1",
			"@effect/platform-node": "^0.100.0",
			"@nodecg/cli": "2.7.1",
			"@nodecg/database-adapter-sqlite-legacy": "2.7.1",
			"@nodecg/database-adapter-types": "2.7.0",
			"@nodecg/internal-util": "2.7.1",
			"@nodecg/json-schema-defaults": "^1.0.4",
			"@nodecg/json-schema-lib": "0.1.0",
			"@open-iframe-resizer/core": "^1.6.0",
			"@opentelemetry/sdk-logs": "^0.203.0",
			"@opentelemetry/sdk-metrics": "^2.2.0",
			"@opentelemetry/sdk-trace-node": "^2.2.0",
			"@polymer/app-layout": "^3.1.0",
			"@polymer/app-route": "^3.0.2",
			"@polymer/iron-collapse": "^3.0.1",
			"@polymer/iron-flex-layout": "^3.0.1",
			"@polymer/iron-icons": "^3.0.1",
			"@polymer/iron-image": "^3.0.2",
			"@polymer/iron-localstorage": "^3.0.1",
			"@polymer/iron-pages": "^3.0.1",
			"@polymer/iron-selector": "^3.0.1",
			"@polymer/paper-button": "^3.0.1",
			"@polymer/paper-card": "^3.0.1",
			"@polymer/paper-dialog": "^3.0.1",
			"@polymer/paper-dialog-behavior": "^3.0.1",
			"@polymer/paper-dialog-scrollable": "^3.0.1",
			"@polymer/paper-icon-button": "^3.0.2",
			"@polymer/paper-item": "^3.0.1",
			"@polymer/paper-slider": "^3.0.1",
			"@polymer/paper-spinner": "^3.0.2",
			"@polymer/paper-styles": "^3.0.1",
			"@polymer/paper-tabs": "^3.1.0",
			"@polymer/paper-toast": "^3.0.1",
			"@polymer/paper-toolbar": "^3.0.1",
			"@polymer/polymer": "^3.5.1",
			"@sentry/browser": "^7.91.0",
			"@sentry/node": "^7.91.0",
			"@types/cookie-parser": "^1.4.6",
			"@types/express-session": "^1.17.10",
			"@types/multer": "^1.4.11",
			"@types/node": "^20.19.0",
			"@types/passport": "^1.0.16",
			"@types/soundjs": "^0.6.31",
			"@vaadin/vaadin-upload": "^4.4.3",
			"@webcomponents/webcomponentsjs": "^2.8.0",
			"ajv": "^8.17.1",
			"ajv-draft-04": "^1.0.0",
			"ajv-formats": "^2.1.1",
			"body-parser": "^1.20.2",
			"cheerio": "1.0.0-rc.12",
			"chokidar": "^4.0.3",
			"clipboard": "^2.0.11",
			"compression": "^1.7.4",
			"cookie-parser": "^1.4.6",
			"cookies-js": "^1.2.3",
			"cosmiconfig": "^8.3.6",
			"draggabilly": "^2.4.1",
			"effect": "^3.19.3",
			"events": "^3.3.0",
			"express": "^4.18.2",
			"express-session": "^1.17.3",
			"express-transform-bare-module-specifiers": "^1.0.4",
			"extend": "^3.0.2",
			"fast-equals": "^5.0.1",
			"fast-memoize": "^2.5.2",
			"fp-ts": "^2.16.9",
			"git-rev-sync": "^3.0.2",
			"hasha": "^5.2.2",
			"httpolyglot": "^0.1.2",
			"is-error": "^2.2.2",
			"json-ptr": "^3.1.1",
			"klona": "^2.0.6",
			"lodash": "^4.17.21",
			"multer": "^1.4.5-lts.1",
			"nano-spawn": "^0.2.0",
			"object-path": "^0.11.8",
			"packery": "^3.0.0",
			"passport": "^0.6.0",
			"passport-discord": "^0.1.4",
			"passport-local": "^1.0.0",
			"passport-steam": "^1.0.18",
			"passport-twitch-helix": "^1.1.0",
			"process": "^0.11.10",
			"semver": "^7.6.3",
			"serialize-error": "^8.1.0",
			"socket.io": "^4.8.1",
			"socket.io-client": "^4.8.1",
			"soundjs": "^1.0.1",
			"ts-essentials": "^9.4.1",
			"type-fest": "^5.2.0",
			"util": "^0.12.5",
			"winston": "^3.11.0",
			"yargs": "^15.4.1",
			"zod": "^3.22.4"
		},
		"devDependencies": {
			"@types/compression": "^1.7.5",
			"@types/express": "^4.17.21",
			"@types/extend": "^3.0.4",
			"@types/git-rev-sync": "^2.0.2",
			"@types/is-ci": "^3.0.4",
			"@types/lodash": "^4.17.13",
			"@types/object-path": "^0.11.4",
			"@types/passport-discord": "^0.1.14",
			"@types/passport-local": "^1.0.38",
			"@types/passport-steam": "^1.0.5",
			"@types/semver": "^7.5.8",
			"@types/yargs": "^15.0.19",
			"is-ci": "^3.0.1",
			"npm-run-all2": "^7.0.2",
			"onchange": "^7.1.0",
			"puppeteer": "^24.28.0",
			"tinyglobby": "^0.2.15",
			"tsdown": "^0.16.1",
			"tsx": "^4.19.2",
			"typescript": "~5.9.3",
			"vitest-mock-express": "^2.2.0"
		},
		"publishConfig": {
			"access": "public",
			"provenance": true,
			"registry": "https://registry.npmjs.org"
		}
	};
}) });

//#endregion
//#region src/shared/api.base.ts
const { version } = require_package();
var NodeCGAPIBase = class extends TypedEmitter {
	static version = version;
	/**
	* An object containing references to all Replicants that have been declared in this `window`, sorted by bundle.
	* E.g., `NodeCG.declaredReplicants.myBundle.myRep`
	*/
	static declaredReplicants;
	/**
	* Lets you easily wait for a group of Replicants to finish declaring.
	*
	* Returns a promise which is resolved once all provided Replicants
	* have emitted a `change` event, which is indicates that they must
	* have finished declaring.
	*
	* This method is only useful in client-side code.
	* Server-side code never has to wait for Replicants.
	*
	* @param replicants {Replicant}
	* @returns {Promise<any>}
	*
	* @example <caption>From a graphic or dashboard panel:</caption>
	* const rep1 = nodecg.Replicant('rep1');
	* const rep2 = nodecg.Replicant('rep2');
	*
	* // You can provide as many Replicant arguments as you want,
	* // this example just uses two Replicants.
	* NodeCG.waitForReplicants(rep1, rep2).then(() => {
	*     console.log('rep1 and rep2 are fully declared and ready to use!');
	* });
	*/
	static async waitForReplicants(...replicants) {
		return new Promise((resolve) => {
			const numReplicants = replicants.length;
			let declaredReplicants = 0;
			replicants.forEach((replicant) => {
				replicant.once("change", () => {
					declaredReplicants++;
					if (declaredReplicants >= numReplicants) resolve();
				});
			});
		});
	}
	/**
	* The name of the bundle which this NodeCG API instance is for.
	*/
	bundleName;
	/**
	* An object containing the parsed content of `cfg/<bundle-name>.json`, the contents of which
	* are read once when NodeCG starts up. Used to quickly access per-bundle configuration properties.
	*/
	bundleConfig;
	/**
	* The version (from package.json) of the bundle which this NodeCG API instance is for.
	* @name NodeCG#bundleVersion
	*/
	bundleVersion;
	/**
	* Provides information about the current git status of this bundle, if found.
	*/
	bundleGit;
	_messageHandlers = [];
	constructor(bundle) {
		super();
		this.bundleName = bundle.name;
		this.bundleConfig = bundle.config;
		this.bundleVersion = bundle.version;
		this.bundleGit = bundle.git;
	}
	listenFor(messageName, bundleNameOrHandlerFunc, handlerFunc) {
		let bundleName;
		if (typeof bundleNameOrHandlerFunc === "string") bundleName = bundleNameOrHandlerFunc;
		else {
			bundleName = this.bundleName;
			handlerFunc = bundleNameOrHandlerFunc;
		}
		if (typeof handlerFunc !== "function") throw new Error(`argument "handler" must be a function, but you provided a(n) ${typeof handlerFunc}`);
		this.log.trace("Listening for %s from bundle %s", messageName, bundleNameOrHandlerFunc);
		this._messageHandlers.push({
			messageName,
			bundleName,
			func: handlerFunc
		});
	}
	unlisten(messageName, bundleNameOrHandler, maybeHandler) {
		let { bundleName } = this;
		let handlerFunc = maybeHandler;
		if (typeof bundleNameOrHandler === "string") bundleName = bundleNameOrHandler;
		else handlerFunc = bundleNameOrHandler;
		if (typeof handlerFunc !== "function") throw new Error(`argument "handler" must be a function, but you provided a(n) ${typeof handlerFunc}`);
		this.log.trace("[%s] Removing listener for %s from bundle %s", this.bundleName, messageName, bundleName);
		const index = this._messageHandlers.findIndex((handler) => handler.messageName === messageName && handler.bundleName === bundleName && handler.func === handlerFunc);
		if (index >= 0) {
			this._messageHandlers.splice(index, 1);
			return true;
		}
		return false;
	}
	Replicant(name, namespaceOrOpts, opts) {
		let namespace;
		if (typeof namespaceOrOpts === "string") namespace = namespaceOrOpts;
		else namespace = this.bundleName;
		if (typeof namespaceOrOpts !== "string") opts = namespaceOrOpts;
		opts = opts ?? {};
		return this._replicantFactory(name, namespace, opts);
	}
};

//#endregion
//#region src/server/api.server.ts
function serverApiFactory(io, replicator, extensions, mount) {
	const apiContexts = /* @__PURE__ */ new Set();
	/**
	* This is what enables intra-context messaging.
	* I.e., passing messages from one extension to another in the same Node.js context.
	*/
	function _forwardMessageToContext(messageName, bundleName, data) {
		process.nextTick(() => {
			apiContexts.forEach((ctx) => {
				ctx._messageHandlers.forEach((handler) => {
					if (messageName === handler.messageName && bundleName === handler.bundleName) handler.func(data);
				});
			});
		});
	}
	return class NodeCGAPIServer extends NodeCGAPIBase {
		static sendMessageToBundle(messageName, bundleName, data) {
			_forwardMessageToContext(messageName, bundleName, data);
			io.emit("message", {
				bundleName,
				messageName,
				content: data
			});
		}
		static readReplicant(name, namespace) {
			if (!name || typeof name !== "string") throw new Error("Must supply a name when reading a Replicant");
			if (!namespace || typeof namespace !== "string") throw new Error("Must supply a namespace when reading a Replicant");
			return replicator.declare(name, namespace).value;
		}
		static Replicant(name, namespace, opts) {
			if (!name || typeof name !== "string") throw new Error("Must supply a name when reading a Replicant");
			if (!namespace || typeof namespace !== "string") throw new Error("Must supply a namespace when reading a Replicant");
			return replicator.declare(name, namespace, opts);
		}
		Logger = Logger;
		log = new Logger(this.bundleName);
		/**
		* The full NodeCG server config, including potentially sensitive keys.
		*/
		config = JSON.parse(JSON.stringify(config));
		/**
		* _Extension only_<br/>
		* Creates a new express router.
		* See the [express docs](http://expressjs.com/en/api.html#express.router) for usage.
		* @function
		*/
		Router = express.default.Router;
		util = { authCheck };
		/**
		* _Extension only_<br/>
		* Object containing references to all other loaded extensions. To access another bundle's extension,
		* it _must_ be declared as a `bundleDependency` in your bundle's [`package.json`]{@tutorial manifest}.
		* @name NodeCG#extensions
		*
		* @example
		* // bundles/my-bundle/package.json
		* {
		*     "name": "my-bundle"
		*     ...
		*     "bundleDependencies": {
		*         "other-bundle": "^1.0.0"
		*     }
		* }
		*
		* // bundles/my-bundle/extension.js
		* module.exports = function (nodecg) {
		*     const otherBundle = nodecg.extensions['other-bundle'];
		*     // Now I can use `otherBundle`!
		* }
		*/
		extension = extensions;
		/**
		* _Extension only_<br/>
		* Mounts Express middleware to the main server Express app.
		* Middleware mounted using this method comes _after_ all the middlware that NodeCG
		* uses internally.
		* See the [Express docs](http://expressjs.com/en/api.html#app.use) for usage.
		* @function
		*/
		mount = mount;
		constructor(bundle) {
			super(bundle);
			apiContexts.add(this);
			io.on("connection", (socket) => {
				socket.on("message", (data, ack) => {
					const wrappedAck = _wrapAcknowledgement(ack);
					this._messageHandlers.forEach((handler) => {
						if (data.messageName === handler.messageName && data.bundleName === handler.bundleName) handler.func(data.content, wrappedAck);
					});
				});
			});
		}
		/**
		* _Extension only_<br/>
		* Gets the server Socket.IO context.
		* @function
		*/
		getSocketIOServer = () => io;
		/**
		* Sends a message to a specific bundle. Also available as a static method.
		* See {@link NodeCG#sendMessage} for usage details.
		* @param {string} messageName - The name of the message.
		* @param {string} bundleName - The name of the target bundle.
		* @param {mixed} [data] - The data to send.
		* @param {function} [cb] - _Browser only_ The error-first callback to handle the server's
		* [acknowledgement](http://socket.io/docs/#sending-and-getting-data-%28acknowledgements%29) message, if any.
		* @return {Promise|undefined} - _Browser only_ A Promise that is rejected if the first argument provided to the
		* acknowledgement is an `Error`, otherwise it is resolved with the remaining arguments provided to the acknowledgement.
		* But, if a callback was provided, this return value will be `undefined`, and there will be no Promise.
		*/
		sendMessageToBundle(messageName, bundleName, data) {
			this.log.trace("Sending message %s to bundle %s with data:", messageName, bundleName, data);
			return NodeCGAPIServer.sendMessageToBundle.apply(NodeCGAPIBase, arguments);
		}
		/**
		* Sends a message with optional data within the current bundle.
		* Messages can be sent from client to server, server to client, or client to client.
		*
		* Messages are namespaced by bundle. To send a message in another bundle's namespace,
		* use {@link NodeCG#sendMessageToBundle}.
		*
		* When a `sendMessage` is used from a client context (i.e., graphic or dashboard panel),
		* it returns a `Promise` called an "acknowledgement". Your server-side code (i.e., extension)
		* can invoke this acknowledgement with whatever data (or error) it wants. Errors sent to acknowledgements
		* from the server will be properly serialized and intact when received on the client.
		*
		* Alternatively, if you do not wish to use a `Promise`, you can provide a standard error-first
		* callback as the last argument to `sendMessage`.
		*
		* If your server-side code has multiple listenFor handlers for your message,
		* you must first check if the acknowledgement has already been handled before
		* attempting to call it. You may so do by checking the `.handled` boolean
		* property of the `ack` function passed to your listenFor handler.
		*
		* See [Socket.IO's docs](http://socket.io/docs/#sending-and-getting-data-%28acknowledgements%29)
		* for more information on how acknowledgements work under the hood.
		*
		* @param {string} messageName - The name of the message.
		* @param {mixed} [data] - The data to send.
		* @param {function} [cb] - _Browser only_ The error-first callback to handle the server's
		* [acknowledgement](http://socket.io/docs/#sending-and-getting-data-%28acknowledgements%29) message, if any.
		* @return {Promise} - _Browser only_ A Promise that is rejected if the first argument provided to the
		* acknowledgement is an `Error`, otherwise it is resolved with the remaining arguments provided to the acknowledgement.
		*
		* @example <caption>Sending a normal message:</caption>
		* nodecg.sendMessage('printMessage', 'dope.');
		*
		* @example <caption>Sending a message and replying with an acknowledgement:</caption>
		* // bundles/my-bundle/extension.js
		* module.exports = function (nodecg) {
		*     nodecg.listenFor('multiplyByTwo', (value, ack) => {
		*         if (value === 4) {
		*             ack(new Error('I don\'t like multiplying the number 4!');
		*             return;
		*         }
		*
		*         // acknowledgements should always be error-first callbacks.
		*         // If you do not wish to send an error, send "null"
		*         if (ack && !ack.handled) {
		*             ack(null, value * 2);
		*         }
		*     });
		* }
		*
		* // bundles/my-bundle/graphics/script.js
		* // Both of these examples are functionally identical.
		*
		* // Promise acknowledgement
		* nodecg.sendMessage('multiplyByTwo', 2)
		*     .then(result => {
		*         console.log(result); // Will eventually print '4'
		*     .catch(error => {
		*         console.error(error);
		*     });
		*
		* // Error-first callback acknowledgement
		* nodecg.sendMessage('multiplyByTwo', 2, (error, result) => {
		*     if (error) {
		*         console.error(error);
		*         return;
		*     }
		*
		*     console.log(result); // Will eventually print '4'
		* });
		*/
		sendMessage(messageName, data) {
			this.sendMessageToBundle(messageName, this.bundleName, data);
		}
		/**
		* Reads the value of a replicant once, and doesn't create a subscription to it. Also available as a static method.
		* @param {string} name - The name of the replicant.
		* @param {string} [bundle=CURR_BNDL] - The bundle namespace to in which to look for this replicant.
		* @param {function} cb - _Browser only_ The callback that handles the server's response which contains the value.
		* @example <caption>From an extension:</caption>
		* // Extensions have immediate access to the database of Replicants.
		* // For this reason, they can use readReplicant synchronously, without a callback.
		* module.exports = function (nodecg) {
		*     var myVal = nodecg.readReplicant('myVar', 'some-bundle');
		* }
		* @example <caption>From a graphic or dashboard panel:</caption>
		* // Graphics and dashboard panels must query the server to retrieve the value,
		* // and therefore must provide a callback.
		* nodecg.readReplicant('myRep', 'some-bundle', value => {
		*     // I can use 'value' now!
		*     console.log('myRep has the value '+ value +'!');
		* });
		*/
		readReplicant(name, param2) {
			let { bundleName } = this;
			if (typeof param2 === "string") bundleName = param2;
			else if (typeof param2 === "object" && bundleName in param2) bundleName = param2.name;
			return this.constructor.readReplicant(name, bundleName);
		}
		_replicantFactory = (name, namespace, opts) => replicator.declare(name, namespace, opts);
	};
}
/**
* By default, Errors get serialized to empty objects when run through JSON.stringify.
* This function wraps an "acknowledgement" callback and checks if the first argument
* is an Error. If it is, that Error is serialized _before_ being sent off to Socket.IO
* for serialization to be sent across the wire.
* @param ack {Function}
* @private
* @ignore
* @returns {Function}
*/
function _wrapAcknowledgement(ack) {
	let handled = false;
	const wrappedAck = function(firstArg, ...restArgs) {
		if (handled) throw new Error("Acknowledgement already handled");
		handled = true;
		if ((0, is_error.default)(firstArg)) firstArg = (0, serialize_error.serializeError)(firstArg);
		ack(firstArg, ...restArgs);
	};
	Object.defineProperty(wrappedAck, "handled", { get() {
		return handled;
	} });
	return wrappedAck;
}

//#endregion
//#region src/server/server/extensions.ts
const log$2 = createLogger("extensions");
var ExtensionManager = class extends node_events.EventEmitter {
	extensions = {};
	_satisfiedDepNames = /* @__PURE__ */ new WeakMap();
	_ExtensionApi;
	_bundleManager;
	_apiInstances = /* @__PURE__ */ new Set();
	constructor(io, bundleManager, replicator, mount) {
		super();
		log$2.trace("Starting extension mounting");
		this._bundleManager = bundleManager;
		this._ExtensionApi = serverApiFactory(io, replicator, this.extensions, mount);
		const allBundles = bundleManager.all();
		const fullyLoaded = [];
		while (allBundles.length > 0) {
			const startLen = allBundles.length;
			for (let i = 0; i < startLen; i++) {
				if (!allBundles[i].bundleDependencies) {
					log$2.debug("Bundle %s has no dependencies", allBundles[i].name);
					if (allBundles[i].hasExtension) this._loadExtension(allBundles[i]);
					fullyLoaded.push(allBundles[i]);
					allBundles.splice(i, 1);
					break;
				}
				if (this._bundleDepsSatisfied(allBundles[i], fullyLoaded)) {
					log$2.debug("Bundle %s has extension with satisfied dependencies", allBundles[i].name);
					if (allBundles[i].hasExtension) this._loadExtension(allBundles[i]);
					fullyLoaded.push(allBundles[i]);
					allBundles.splice(i, 1);
					break;
				}
			}
			const endLen = allBundles.length;
			if (startLen === endLen) {
				allBundles.forEach((bundle) => {
					const unsatisfiedDeps = [];
					for (const dep in bundle.bundleDependencies) {
						/* istanbul ignore if */
						if (!{}.hasOwnProperty.call(bundle.bundleDependencies, dep)) continue;
						if (this._satisfiedDepNames.get(bundle)?.includes(dep)) continue;
						unsatisfiedDeps.push(`${dep}@${bundle.bundleDependencies[dep]}`);
					}
					log$2.error("Bundle \"%s\" can not be loaded, as it has unsatisfied dependencies:\n", bundle.name, unsatisfiedDeps.join(", "));
					bundleManager.remove(bundle.name);
				});
				log$2.error("%d bundle(s) can not be loaded because they have unsatisfied dependencies", endLen);
				break;
			}
		}
		log$2.trace("Completed extension mounting");
	}
	emitToAllInstances(eventName, ...params) {
		for (const instance of this._apiInstances) instance.emit(eventName, ...params);
	}
	_loadExtension(bundle) {
		const ExtensionApi = this._ExtensionApi;
		const extPath = node_path.join(bundle.dir, "extension");
		try {
			let mod = (process.env.NODECG_TEST ? require : module.require)(extPath);
			if (mod.__esModule) mod = mod.default;
			const apiInstance = new ExtensionApi(bundle);
			this._apiInstances.add(apiInstance);
			const extension = mod(apiInstance);
			log$2.info("Mounted %s extension", bundle.name);
			this.extensions[bundle.name] = extension;
		} catch (err) {
			this._bundleManager.remove(bundle.name);
			log$2.warn("Failed to mount %s extension:\n", bundle.name, stringifyError(err));
			if (sentryEnabled) {
				err.message = `Failed to mount ${bundle.name} extension: ${err?.message ?? err}`;
				__sentry_node.captureException(err);
			}
		}
	}
	_bundleDepsSatisfied(bundle, loadedBundles) {
		const deps = bundle.bundleDependencies;
		if (!deps) return true;
		const unsatisfiedDepNames = Object.keys(deps);
		const arr = this._satisfiedDepNames.get(bundle)?.slice(0) ?? [];
		loadedBundles.forEach((loadedBundle) => {
			const index = unsatisfiedDepNames.indexOf(loadedBundle.name);
			if (index > -1) {
				if (semver.default.satisfies(loadedBundle.version, deps[loadedBundle.name])) {
					arr.push(loadedBundle.name);
					unsatisfiedDepNames.splice(index, 1);
				}
			}
		});
		this._satisfiedDepNames.set(bundle, arr);
		return unsatisfiedDepNames.length === 0;
	}
};

//#endregion
//#region src/server/server/socketApiMiddleware.ts
const log$1 = createLogger("socket-api");
function socketApiMiddleware(socket, next) {
	try {
		log$1.trace("New socket connection: ID %s with IP %s", socket.id, socket.handshake.address);
		socket.on("error", (err) => {
			if (sentryEnabled) __sentry_node.captureException(err);
			log$1.error(err);
		});
		socket.on("message", (data) => {
			log$1.trace("Received message %s (sent to bundle %s) with data:", data.messageName, data.bundleName, data.content);
			socket.broadcast.emit("message", data);
		});
		socket.on("joinRoom", async (room, cb) => {
			if (typeof room !== "string") {
				cb("Room must be a string", void 0);
				return;
			}
			if (!Object.keys(socket.rooms).includes(room)) {
				log$1.trace("Socket %s joined room:", socket.id, room);
				await socket.join(room);
			}
			cb(void 0, void 0);
		});
		next();
	} catch (error) {
		next(error);
	}
}

//#endregion
//#region src/server/server/index.ts
if (config.sentry?.enabled) {
	__sentry_node.init({
		dsn: config.sentry.dsn,
		serverName: os.hostname(),
		release: nodecgPackageJson.version
	});
	__sentry_node.configureScope((scope) => {
		scope.setTags({
			nodecgHost: config.host,
			nodecgBaseURL: config.baseURL
		});
	});
	process.on("unhandledRejection", (reason, p) => {
		console.error("Unhandled Rejection at:", p, "reason:", reason);
		__sentry_node.captureException(reason);
	});
	console.info("[nodecg] Sentry enabled.");
}
const fs$1 = require("fs");
const path$1 = require("path");
const renderTemplate = (0, fast_memoize.default)((content, options$1) => (0, lodash.template)(content)(options$1));
const log = createLogger("server");
const createServer = effect.Effect.fn("createServer")(function* (isReady) {
	const app = (0, express.default)();
	/**
	* HTTP(S) server setup
	*/
	const server = yield* effect.Effect.promise(async () => {
		if (config.ssl.enabled && config.ssl.keyPath && config.ssl.certificatePath) {
			const sslOpts = {
				key: fs$1.readFileSync(config.ssl.keyPath),
				cert: fs$1.readFileSync(config.ssl.certificatePath)
			};
			if (config.ssl.passphrase) sslOpts.passphrase = config.ssl.passphrase;
			if (config.ssl.allowHTTP) {
				const { createServer: createServer$1 } = await import("httpolyglot");
				return createServer$1(sslOpts, app);
			} else {
				const { createServer: createServer$1 } = await import("https");
				return createServer$1(sslOpts, app);
			}
		} else {
			const { createServer: createServer$1 } = await import("http");
			return createServer$1(app);
		}
	});
	const waitForError = yield* effect.Effect.forkScoped(effect.Effect.async((resume) => {
		const errorHandler$1 = (err) => {
			resume(effect.Effect.fail(new UnknownError(err)));
		};
		server.on("error", errorHandler$1);
		return effect.Effect.sync(() => {
			server.removeListener("error", errorHandler$1);
		});
	}));
	const waitForClose = yield* effect.Effect.forkScoped(effect.Effect.async((resume) => {
		const closeHandler = () => {
			resume(effect.Effect.void);
		};
		server.on("close", closeHandler);
		return effect.Effect.sync(() => {
			server.removeListener("close", closeHandler);
		});
	}));
	const io = yield* effect.Effect.acquireRelease(effect.Effect.sync(() => {
		const io$1 = new socket_io.Server(server);
		io$1.setMaxListeners(75);
		return io$1;
	}), (io$1) => effect.Effect.promise(async () => {
		io$1.disconnectSockets(true);
		await io$1.close();
	})).pipe(effect.Effect.map((io$1) => io$1.of("/")));
	log.info(`Starting NodeCG ${nodecgPackageJson.version} (Running on Node.js ${process.version})`);
	if (sentryEnabled) app.use(__sentry_node.Handlers.requestHandler());
	app.use((0, compression.default)());
	app.use(body_parser.default.json({ verify: (req, _res, buf) => {
		req.rawBody = buf;
	} }));
	app.use(body_parser.default.urlencoded({
		extended: true,
		verify: (req, _res, buf) => {
			req.rawBody = buf;
		}
	}));
	app.set("trust proxy", true);
	app.engine("tmpl", (filePath, options$1, callback) => {
		fs$1.readFile(filePath, (error, content) => {
			if (error) return callback(error);
			return callback(null, renderTemplate(content, options$1));
		});
	});
	const bundleManager = new BundleManager([path$1.join(__nodecg_internal_util.rootPaths.getRuntimeRoot(), "bundles")].concat(config.bundles?.paths ?? []), path$1.join(__nodecg_internal_util.rootPaths.getRuntimeRoot(), "cfg"), nodecgPackageJson.version, config);
	let databaseAdapter = __nodecg_database_adapter_sqlite_legacy.databaseAdapter;
	let databaseAdapterExists = false;
	for (const bundle of bundleManager.all()) if (bundle.nodecgBundleConfig.databaseAdapter) {
		log.warn("`databaseAdapter` is an experimental feature and may be changed without major version bump.");
		if (databaseAdapterExists) throw new Error("Multiple bundles are attempting to set the database adapter.");
		databaseAdapter = bundle.nodecgBundleConfig.databaseAdapter;
		databaseAdapterExists = true;
	}
	app.use((_, res, next) => {
		res.locals.databaseAdapter = databaseAdapter;
		next();
	});
	if (config.login?.enabled) {
		log.info("Login security enabled");
		const { app: loginMiddleware, sessionMiddleware } = createMiddleware(databaseAdapter, {
			onLogin: (user) => {
				if (user.roles.length > 0) extensionManager.emitToAllInstances("login", user);
			},
			onLogout: (user) => {
				if (user.roles.length > 0) extensionManager.emitToAllInstances("logout", user);
			}
		});
		app.use(loginMiddleware);
		const wrap = (middleware) => (socket, next) => middleware(socket.request, {}, next);
		io.use(wrap(sessionMiddleware));
		io.use(wrap(passport.default.initialize()));
		io.use(wrap(passport.default.session()));
		io.use(createSocketAuthMiddleware(databaseAdapter));
	} else app.get("/login*", (_, res) => {
		res.redirect("/dashboard");
	});
	io.use(socketApiMiddleware);
	yield* effect.Effect.async((resume) => {
		if (bundleManager.ready) {
			resume(effect.Effect.void);
			return;
		}
		const succeed = () => {
			resume(effect.Effect.void);
		};
		bundleManager.once("ready", succeed);
		return effect.Effect.sync(() => {
			bundleManager.removeListener("ready", succeed);
		});
	}).pipe(effect.Effect.timeoutFail({
		duration: "15 seconds",
		onTimeout: () => new FileWatcherReadyTimeoutError()
	}));
	for (const bundle of bundleManager.all()) if (bundle.transformBareModuleSpecifiers) {
		log.warn(`${bundle.name} uses the deprecated "transformBareModuleSpecifiers" feature. This feature will be removed in NodeCG v3. Please migrate to using browser-native import maps instead: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap`);
		const opts = {
			rootDir: __nodecg_internal_util.rootPaths.getRuntimeRoot(),
			modulesUrl: `/bundles/${bundle.name}/node_modules`
		};
		app.use(`/bundles/${bundle.name}/*`, (0, express_transform_bare_module_specifiers.default)(opts));
	}
	log.trace(`Attempting to listen on ${config.host}:${config.port}`);
	const errorHandler = (err) => {
		if (err.code === "EADDRINUSE") {
			if (!process.env.NODECG_TEST) log.error(`Listen ${config.host}:${config.port} in use, is NodeCG already running? NodeCG will now exit.`);
		} else log.error("Unhandled error!", err);
	};
	server.addListener("error", errorHandler);
	yield* effect.Effect.addFinalizer(() => effect.Effect.sync(() => {
		server.removeListener("error", errorHandler);
	}));
	if (sentryEnabled) {
		const sentryHelpers = new SentryConfig(bundleManager);
		app.use(sentryHelpers.app);
	}
	const persistedReplicantEntities = yield* effect.Effect.promise(async () => {
		return await databaseAdapter.getAllReplicants();
	});
	const replicator = yield* effect.Effect.acquireRelease(effect.Effect.sync(() => new Replicator(io, databaseAdapter, persistedReplicantEntities)), (replicator$1) => effect.Effect.sync(() => replicator$1.saveAllReplicants()));
	const graphics = new GraphicsLib(io, bundleManager, replicator);
	app.use(graphics.app);
	const dashboard = new DashboardLib(bundleManager);
	app.use(dashboard.app);
	const mounts = new MountsLib(bundleManager.all());
	app.use(mounts.app);
	const sounds = new SoundsLib(bundleManager.all(), replicator);
	app.use(sounds.app);
	const assets = createAssetsMiddleware(bundleManager.all(), replicator);
	app.use("/assets", assets);
	const sharedSources = new SharedSourcesLib(bundleManager.all());
	app.use(sharedSources.app);
	if (sentryEnabled) app.use(__sentry_node.Handlers.errorHandler());
	app.use((err, _req, res, _next) => {
		res.statusCode = 500;
		if (sentryEnabled) res.end(`Internal error\nSentry issue ID: ${String(res.sentry)}\n`);
		else res.end("Internal error");
		log.error(err);
	});
	const bundlesReplicant = replicator.declare("bundles", "nodecg", {
		schemaPath: path$1.join(__nodecg_internal_util.rootPaths.nodecgInstalledPath, "schemas/bundles.json"),
		persistent: false
	});
	const updateBundlesReplicant = (0, lodash.debounce)(() => {
		bundlesReplicant.value = (0, klona_json.klona)(bundleManager.all());
	}, 100);
	bundleManager.on("ready", updateBundlesReplicant);
	bundleManager.on("bundleChanged", updateBundlesReplicant);
	bundleManager.on("gitChanged", updateBundlesReplicant);
	bundleManager.on("bundleRemoved", updateBundlesReplicant);
	updateBundlesReplicant();
	const mount = (...args) => app.use(...args);
	const extensionManager = yield* effect.Effect.acquireRelease(effect.Effect.sync(() => new ExtensionManager(io, bundleManager, replicator, mount)), (extensionManager$1) => effect.Effect.sync(() => extensionManager$1.emitToAllInstances("serverStopping")));
	extensionManager.emitToAllInstances("extensionsLoaded");
	const runtime = yield* effect.Effect.runtime();
	return {
		run: effect.Effect.fn(function* () {
			server.listen({
				host: config.host,
				port: process.env.NODECG_TEST ? void 0 : config.port
			}, () => effect.Runtime.runSync(runtime, effect.Effect.gen(function* () {
				if (process.env.NODECG_TEST) {
					const addrInfo = server.address();
					if (typeof addrInfo !== "object" || addrInfo === null) throw new Error("couldn't get port number");
					const { port } = addrInfo;
					log.warn(`Test mode active, using automatic listen port: ${port}`);
					config.port = port;
					filteredConfig.port = port;
					process.env.NODECG_TEST_PORT = String(port);
				}
				const protocol$1 = config.ssl?.enabled ? "https" : "http";
				log.info("NodeCG running on %s://%s", protocol$1, config.baseURL);
				if (isReady) yield* effect.Deferred.succeed(isReady, void 0);
				extensionManager.emitToAllInstances("serverStarted");
			})));
			return yield* effect.Effect.raceFirst(waitForError, waitForClose);
		}),
		getExtensions: () => ({ ...extensionManager.extensions }),
		saveAllReplicantsNow: () => replicator.saveAllReplicantsNow(),
		bundleManager
	};
});
var FileWatcherReadyTimeoutError = class extends effect.Data.TaggedError("FileWatcherReadyTimeoutError") {
	message = "Timed out waiting for file watcher to be ready";
};

//#endregion
//#region src/server/bootstrap.ts
/**
* This file is used to automatically bootstrap a NodeCG Server instance.
* It exports nothing and offers no controls.
*
* At this time, other means of starting NodeCG are not officially supported,
* but they are used internally by our tests.
*
* Tests directly instantiate the NodeCGServer class, so that they may have full control
* over its lifecycle and when the process exits.
*/
if ((0, __nodecg_internal_util.isLegacyProject)()) {
	const cwd = process.cwd();
	const runtimeRootPath = __nodecg_internal_util.rootPaths.runtimeRootPath;
	if (cwd !== runtimeRootPath) {
		console.warn(`[nodecg] process.cwd is ${cwd}, expected ${runtimeRootPath}`);
		process.chdir(runtimeRootPath);
		console.info(`[nodecg] Changed process.cwd to ${runtimeRootPath}`);
	}
}
const handleFloatingErrors = () => effect.Effect.async((resume) => {
	const uncaughtExceptionHandler = (err) => {
		if (!sentryEnabled) if (exitOnUncaught) {
			cleanup();
			resume(effect.Effect.fail(new UnknownError(err)));
		} else {
			console.error("UNCAUGHT EXCEPTION!");
			console.error(err);
		}
	};
	const unhandledRejectionHandler = (err) => {
		if (!sentryEnabled) {
			console.error("UNHANDLED PROMISE REJECTION!");
			console.error(err);
		}
	};
	const cleanup = () => {
		process.removeListener("uncaughtException", uncaughtExceptionHandler);
		process.removeListener("unhandledRejection", unhandledRejectionHandler);
	};
	process.addListener("uncaughtException", uncaughtExceptionHandler);
	process.addListener("unhandledRejection", unhandledRejectionHandler);
	return effect.Effect.sync(cleanup);
});
const main = effect.Effect.fn("main")(function* () {
	process.title = `NodeCG - ${nodecgPackageJson.version}`;
	const handleFloatingErrorsFiber = yield* effect.Effect.fork(handleFloatingErrors());
	const server = yield* createServer();
	yield* effect.Effect.raceFirst(server.run(), effect.Fiber.join(handleFloatingErrorsFiber));
}, effect.Effect.scoped);
__effect_platform_node.NodeRuntime.runMain(main().pipe(withSpanProcessorLive, withLogLevelConfig, expectError()));

//#endregion
//# sourceMappingURL=bootstrap.js.map