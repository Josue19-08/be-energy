# Roadmap — BeEnergy

---

## Estado actual (v0.3.1)

Lo que funciona hoy en Stellar Testnet:

- **Smart contracts Soroban** — Token HDROP (mint, transfer, burn), distribución de energía, gobernanza comunitaria. Basados en OpenZeppelin Stellar Contracts v0.5.1.
- **Dashboard** — Balance HDROP en tiempo real, estadísticas de comunidad on-chain, historial de transacciones desde Horizon, detección y activación de cuenta nueva (Friendbot en testnet).
- **DeFindex** — Vault comunitario integrado. Los prosumidores depositan HDROP y el fondo los distribuye proporcionalmente.
- **Marketplace** — Compra/venta de créditos energéticos entre vecinos.
- **Minting** — Emisión de HDROP contra lectura validada por la cooperativa (admin con rol minter).

---

## Mejoras para próximas versiones

### Onboarding sin fricción

Hoy el usuario necesita instalar Freighter, crear una cuenta Stellar y tener XLM para fees. Esto es una barrera enorme para adopción masiva.

**Plan:** Integrar Smart Account Kit de Stellar — wallets con passkeys (biometría del celular), sin necesidad de extensión. Fee sponsoring vía relayer para que el usuario no necesite XLM para su primera transacción.

Resultado: el prosumidor abre la app, se autentica con huella/cara, y opera. Sin seed phrases, sin extensiones, sin XLM inicial.

### Contratos

- **Upgrade a OpenZeppelin v0.6.0** — Timelock, WAD math, fixes de auditoría. Sin breaking changes respecto a v0.5.1.
- **Gobernanza completa** — Votación on-chain con quorum configurable. Los miembros de la comunidad deciden tarifas, reglas de distribución, ingreso de nuevos miembros.
- **Privacidad** — Migrar de simulación a ZK-SNARKs para que las lecturas de consumo individual sean verificables sin revelar el dato exacto.

### DeFindex

Hoy el vault es pasivo (hodl). La mejora es activar estrategias de yield real: los HDROP depositados generan rendimiento a través de protocolos DeFi en Stellar, no solo se guardan.

### Mainnet

Deploy a la red principal de Stellar cuando:
1. Los contratos estén auditados
2. El flujo de onboarding no requiera conocimiento técnico
3. Al menos una cooperativa esté validando el producto en testnet

---

*Última actualización: marzo 2026*
