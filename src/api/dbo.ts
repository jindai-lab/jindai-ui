export interface DbObject {
	_id: string
}

export interface Dataset extends DbObject {
	allowed_users: string[]
	display_name: string
	mongocollection: string
	name: string
	order_weight: number
	sources: string[]
}

export interface History extends DbObject {
	created_at: Date
	queries: string[]
	user: string
}

export interface MediaItem extends DbObject {
	height: number
	width: number
	item_type: string
	rating: number
	source: Source
	thumbnail: string
	src: string
}

export interface Source {
	file?: string
	url?: string
	page?: number
}

export interface Meta {
	app_title: string
	app_dark: boolean
	domain_delimiter: string
	multi_servers: boolean
}

export interface Paragraph extends DbObject {
	source: Source
	keywords: Array<string>
	author: string
	pdate: Date | string
	outline: string
	pagenum: string | number
	content: string
	lang: string
	images: Array<MediaItem>
	mongocollection?: string
}

export interface TaskDBO extends DbObject {
	concurrent: number
	creator: string
	last_run: Date
	name: string
	params: { [param: string]: any }
	pipeline: Array<PipelineStageSpecification>
	resume_next: boolean
	shared: boolean
	shortcut_map: { [name: string]: string }
}

export type PipelineStageSpecification = [
	string,
	{ [param: string]: any }
]

export interface Term extends DbObject {
	field: string
	term: string
	aliases: Array<string>
}

export interface User extends DbObject {
	roles: Array<string>
	username: string
	otp_secret?: string 
}

export interface PluginPage {
	keybind: string
	icon: string
	handler: string
	name: string
	format: string
}

export type Pipelines = {
	[group: string]: {
		[name: string]: PipelineStage
	}
}

export type PipelineArgument = {
	name: string,
	type: "str" | "int" | "float" | "bool" | "LINES" | "QUERY" | "TASK" | "PIPELINE" | "DATASET" | "object" | "file" | "LANG"
	description: string,
	default: string,
	keys?: string[]
}

export type PipelineStage = {
	doc?: string,
	args: PipelineArgument[]
}

export type TaggingShortcut = {
	expr: string,
	name: string
}

export type FileStorageItem = {
	name: string,
	fullpath: string,
	'created-at' : number,
	'modified-at': number,
	size: number,
	type: 'folder' | 'file' | 'back'
}

export type JobResult = {

}

export interface ScheduledJob {

}

export interface QueueJob {

}

export interface AutoTag extends DbObject {
	cond: string,
	tag: string
}