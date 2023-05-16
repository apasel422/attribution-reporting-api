import assert from 'node:assert/strict'
import { validateSource, validateTrigger } from './validate-json.js'

assert.deepEqual(validateSource(`{
  "source_event_id": "abc"
}`), {
  errors: [
    {
      msg: 'does not match pattern "^[0-9]+$"',
      path: [ 'source_event_id' ]
    },
    {
      msg: 'requires property "destination"',
      path: [],
    },
  ],
})

assert.deepEqual(validateTrigger(`{
  "event_triggers": [
    {"trigger_data": 3}
  ]
}`), {
  errors: [
    {
      msg: 'is not of a type(s) string',
      path: [
        'event_triggers',
        0,
        'trigger_data'
     ]
   }
 ],
})
