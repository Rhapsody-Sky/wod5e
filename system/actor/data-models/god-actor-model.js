import { SPCActorModel } from './spc-actor-model.js'

export class GodActorModel extends SPCActorModel {
  static defineSchema() {
    const fields = foundry.data.fields
    const schema = super.defineSchema()

    schema.divineattributes = new fields.SchemaField({
      aspect: divineAttributeField(fields),
      identity: divineAttributeField(fields),
      insight: divineAttributeField(fields),
      power: divineAttributeField(fields),
      force: divineAttributeField(fields)
    })

    return schema
  }
}

function divineAttributeField(fields) {
  return new fields.SchemaField({
    value: new fields.NumberField({ initial: 1, min: 0 })
  })
}
