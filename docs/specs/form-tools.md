# Form Tool Calling

AI uses function calling to update form fields during conversation.

## Tools

### `update_form_field`

Updates a single form field.

```json
{ "field": "companyName", "value": "Acme Corp" }
```

### `get_latest_form_data`

Returns the latest form data. No parameters.

### `get_form_schema`

Returns the form schema. Optional parameters: `fields` - list of fields to return.

## Behavior

- AI extracts info from natural speech and calls tools automatically
- Multiple fields can be updated in one turn
- Form UI reflects changes in real-time
