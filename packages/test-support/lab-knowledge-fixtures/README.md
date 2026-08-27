# lab-knowledge-fixtures

English | [中文](README.zh.md)

Shared keyless data for the current laboratory Knowledge MVP. The package contains the local PDF fixture catalog, a deterministic parser for real fixture bytes, and a public Knowledge Consumer fixture with capability, source/version, citation and published-SOP records.

The fixture package is test support, not a production Knowledge API. Runtime code still uses the public lab-mvp-web Facade and lab-project Consumer contract.

## Model Experience

### Knowledge fixture records

#### What the model sees

The fixture makes confirmed `citationId` and published `sopRevisionId` records available to keyless tests; it exposes no model-facing tool.

#### Token effect

The fixture package does not send model requests or add prompt content.

#### KV Cache effect

The fixture package does not create model cache state.

## Known Limitations and Deferred Work

- The fixture records cover the current MVP contract and do not replace production Knowledge storage or parser implementations.
