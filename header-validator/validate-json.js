import sourceSchema from './source.schema.json' assert { type: 'json' }
import triggerSchema from './trigger.schema.json' assert { type: 'json' }

async function getValidatorFromEnvironment() {
  let Validator
  if (typeof window === 'undefined') {
    // Environment = nodeJS -> Take structured header functions from the locally installed node module
    const jsonschemaLib = await import('jsonschema')
    Validator = jsonschemaLib.default.Validator
  } else {
    // Environment = browser -> Take structured header functions from the lib loaded from the CDN (see HTML)
    Validator = window.jsonschema.Validator
  }
  return Validator
}

const Validator = await getValidatorFromEnvironment()

function validateJSON(json, schema) {
  let value
  try {
    value = JSON.parse(json)
  } catch (err) {
    return { errors: [{ msg: err.message }] }
  }
  const { errors } = new Validator().validate(value, schema)
  return {
    errors: errors.map(err => ({ msg: err.message, path: err.path })),
  }
}

export function validateSource(json) {
  return validateJSON(json, sourceSchema)
}

export function validateTrigger(json) {
  return validateJSON(json, triggerSchema)
}
