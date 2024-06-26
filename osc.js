const { InstanceBase, Regex, runEntrypoint } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')

class OSCInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
	}

	async init(config) {
		this.config = config

		this.updateStatus('ok')

		this.updateActions() // export actions
	}
	// When module gets deleted
	async destroy() {
		this.log('debug', 'destroy')
	}

	async configUpdated(config) {
		this.config = config
	}

	// Return config fields for web config
	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP',
				width: 8,
				regex: Regex.IP,
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'Target Port',
				width: 4,
				regex: Regex.PORT,
			},
		]
	}

	updateActions() {
		const sendOscMessage = (path, args) => {
			this.log('debug', `Sending OSC ${this.config.host}:${this.config.port} ${path}`)
			this.log('debug', `Sending Args ${JSON.stringify(args)}`)
			this.oscSend(this.config.host, this.config.port, path, args)
		}

		this.setActionDefinitions({
			send_blank: {
				name: 'Send message without arguments',
				options: [
					{
						type: 'textinput',
						label: 'OSC Path',
						id: 'path',
						default: '/osc/path',
						useVariables: true,
					},
				],
				callback: async (event) => {
					const path = await this.parseVariablesInString(event.options.path)

					sendOscMessage(path, [])
				},
			},
			send_int: {
				name: 'Send integer',
				options: [
					{
						type: 'textinput',
						label: 'OSC Path',
						id: 'path',
						default: '/osc/path',
						useVariables: true,
					},
					{
						type: 'checkbox',
						label: 'Enable Fade',
						id: 'enableFade',
						default: false,
					},
					{
						type: 'textinput',
						label: 'Value',
						id: 'int',
						default: 1,
						regex: Regex.SIGNED_NUMBER,
						useVariables: true,
						isVisible: (options) => !options.enableFade,
					},
					{
						type: 'textinput',
						label: 'Start Value',
						id: 'start',
						regex: Regex.SIGNED_NUMBER,
						useVariables: true,
						isVisible: (options) => options.enableFade,
					},
					{
						type: 'textinput',
						label: 'End Value',
						id: 'end',
						regex: Regex.SIGNED_NUMBER,
						useVariables: true,
						isVisible: (options) => options.enableFade,
					},
					{
						type: 'textinput',
						label: 'Fade time (ms)',
						id: 'fade',
						default: 1000,
						regex: Regex.INT,
						useVariables: true,
						isVisible: (options) => options.enableFade,
					},
				],
				callback: async (event) => {
					const path = await this.parseVariablesInString(event.options.path)
					const int = parseInt(await this.parseVariablesInString(event.options.int))
					const enableFade = event.options.enableFade
			
					if (enableFade) {
						const start = parseInt(await this.parseVariablesInString(event.options.start))
						const end = parseInt(await this.parseVariablesInString(event.options.end))
						const fade = parseInt(await this.parseVariablesInString(event.options.fade))
						
						const steps = Math.abs(end - start)
						const interval = fade / steps
						const stepValue = (end > start ? 1 : -1)
			
						for (let i = 0; i <= steps; i++) {
							setTimeout(() => {
								const value = start + stepValue * i
								sendOscMessage(path, [
									{
										type: 'i',
										value: value,
									},
								])
							}, interval * i)
						}
					} else {
						sendOscMessage(path, [
							{
								type: 'i',
								value: int,
							},
						])
					}
				},
			},									
			send_float: {
				name: 'Send float',
				options: [
					{
						type: 'textinput',
						label: 'OSC Path',
						id: 'path',
						default: '/osc/path',
						useVariables: true,
					},
					{
						type: 'checkbox',
						label: 'Enable Fade',
						id: 'enableFade',
						default: false,
					},
					{
						type: 'textinput',
						label: 'Value',
						id: 'float',
						default: 1,
						regex: Regex.SIGNED_FLOAT,
						useVariables: true,
						isVisible: (options) => !options.enableFade,
					},
					{
						type: 'textinput',
						label: 'Start Value',
						id: 'start',
						regex: Regex.SIGNED_FLOAT,
						useVariables: true,
						isVisible: (options) => options.enableFade,
					},
					{
						type: 'textinput',
						label: 'End Value',
						id: 'end',
						regex: Regex.SIGNED_FLOAT,
						useVariables: true,
						isVisible: (options) => options.enableFade,
					},
					{
						type: 'textinput',
						label: 'Fade time (ms)',
						id: 'fade',
						default: 1000,
						regex: Regex.INT,
						useVariables: true,
						isVisible: (options) => options.enableFade,
					},
					{
						type: 'number',
						label: 'Granularity',
						tooltip: 'Number of floating points to send',
						id: 'granularity',
						min: 0,
						max: 4,
						default: 2,
						regex: Regex.INT,
						useVariables: true,
						isVisible: (options) => options.enableFade,
					},
				],
				callback: async (event) => {
					const path = await this.parseVariablesInString(event.options.path)
					const enableFade = event.options.enableFade
			
					if (enableFade) {
						const start = parseFloat(await this.parseVariablesInString(event.options.start))
						const end = parseFloat(await this.parseVariablesInString(event.options.end))
						const fade = parseInt(await this.parseVariablesInString(event.options.fade))
						const granularity = parseInt(await this.parseVariablesInString(event.options.granularity))
						
						const stepValue = Math.pow(10, -granularity)
						const steps = Math.ceil(Math.abs(end - start) / stepValue)
						const interval = fade / steps
			
						for (let i = 0; i <= steps; i++) {
							setTimeout(() => {
								const value = start + stepValue * i * (end > start ? 1 : -1)
								const roundedValue = parseFloat(value.toFixed(granularity))
								sendOscMessage(path, [
									{
										type: 'f',
										value: roundedValue,
									},
								])
							}, interval * i)
						}
					} else {
						const float = parseFloat(await this.parseVariablesInString(event.options.float))
						sendOscMessage(path, [
							{
								type: 'f',
								value: float,
							},
						])
					}
				},
			},
			send_string: {
				name: 'Send string',
				options: [
					{
						type: 'textinput',
						label: 'OSC Path',
						id: 'path',
						default: '/osc/path',
						useVariables: true,
					},
					{
						type: 'textinput',
						label: 'Value',
						id: 'string',
						default: 'text',
						useVariables: true,
					},
				],
				callback: async (event) => {
					const path = await this.parseVariablesInString(event.options.path)
					const string = await this.parseVariablesInString(event.options.string)

					sendOscMessage(path, [
						{
							type: 's',
							value: '' + string,
						},
					])
				},
			},
			send_multiple: {
				name: 'Send message with multiple arguments',
				options: [
					{
						type: 'textinput',
						label: 'OSC Path',
						id: 'path',
						default: '/osc/path',
						useVariables: true,
					},
					{
						type: 'textinput',
						label: 'Arguments',
						id: 'arguments',
						default: '1 "test" 2.5',
						useVariables: true,
					},
				],
				callback: async (event) => {
					const path = await this.parseVariablesInString(event.options.path)
					const argsStr = await this.parseVariablesInString(event.options.arguments)

					const rawArgs = (argsStr + '').replace(/“/g, '"').replace(/”/g, '"').split(' ')

					if (rawArgs.length) {
						const args = []
						for (let i = 0; i < rawArgs.length; i++) {
							if (rawArgs[i].length == 0) continue
							if (isNaN(rawArgs[i])) {
								let str = rawArgs[i]
								if (str.startsWith('"')) {
									//a quoted string..
									while (!rawArgs[i].endsWith('"')) {
										i++
										str += ' ' + rawArgs[i]
									}
								} else if(str.startsWith('{')) {
									//Probably a JSON object
									try {
										args.push((JSON.parse(rawArgs[i])))
									} catch (error) {
										this.log('error', `not a JSON object ${rawArgs[i]}`)
									}
								}

								args.push({
									type: 's',
									value: str.replace(/"/g, '').replace(/'/g, ''),
								})
							} else if (rawArgs[i].indexOf('.') > -1) {
								args.push({
									type: 'f',
									value: parseFloat(rawArgs[i]),
								})
							} else {
								args.push({
									type: 'i',
									value: parseInt(rawArgs[i]),
								})
							}
						}

						sendOscMessage(path, args)
					}
				},
			},
			send_boolean: {
				name: 'Send boolean',
				options: [
					{
						type: 'static-text',
						label: 'Attention',
						value: 'The boolean type is non-standard and may only work with some receivers.',
						id: 'warning'
					},
					{
						type: 'textinput',
						label: 'OSC Path',
						id: 'path',
						default: '/osc/path',
						useVariables: true,
					},
					{
						type: 'checkbox',
						label: 'Value',
						id: 'value',
						default: false,
					},
				],
				callback: async (event) => {
					const path = await this.parseVariablesInString(event.options.path)
					let type = 'F'
					if (event.options.value === true) {
						type = 'T'
					}

					sendOscMessage(path, [
						{
							type,
						},
					])
				},
			},
		})
	}
}

runEntrypoint(OSCInstance, UpgradeScripts)
