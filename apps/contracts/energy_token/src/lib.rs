#![no_std]

//! # Energy Token ($ENERGY)
//!
//! Token fungible SEP-41 para representar kWh de energía solar.
//! - 1 token = 1 kWh de energía
//! - Minteo: Solo por cuentas autorizadas (contratos de distribución)
//! - Quema: Cuando se consume energía
//! - Compatible con Stellar DEX para trading P2P

use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, String};
use stellar_access::access_control::{self as access_control, AccessControl};
use stellar_macros::{default_impl, only_role};
use stellar_tokens::fungible::{burnable::FungibleBurnable, Base, FungibleToken};

const TTL_THRESHOLD: u32 = 50_000;
const TTL_EXTEND_TO: u32 = 100_000;

#[contract]
pub struct EnergyToken;

#[contractimpl]
impl EnergyToken {
    /// Constructor del contrato
    ///
    /// # Argumentos
    /// * `admin` - Administrador del token
    /// * `distribution_contract` - Contrato que podrá mintear tokens
    /// * `initial_supply` - Supply inicial (normalmente 0 para energía)
    pub fn __constructor(
        e: &Env,
        admin: Address,
        distribution_contract: Address,
        initial_supply: i128,
    ) {
        // Configurar metadatos del token
        Base::set_metadata(
            e,
            7, // 7 decimales (estándar Stellar)
            String::from_str(e, "HoneyDrop"),
            String::from_str(e, "HDROP"),
        );

        // Configurar admin del sistema de control de acceso
        access_control::set_admin(e, &admin);

        // Otorgar rol de MINTER al contrato de distribución
        access_control::grant_role_no_auth(
            e,
            &admin,
            &distribution_contract,
            &symbol_short!("minter"),
        );

        // Mintear supply inicial al admin si es mayor que 0
        if initial_supply > 0 {
            Base::mint(e, &admin, initial_supply);
        }
    }

    /// Mintea tokens cuando se genera energía
    /// Solo puede ser llamado por cuentas con rol MINTER
    ///
    /// # Argumentos
    /// * `to` - Dirección que recibirá los tokens
    /// * `amount` - Cantidad de kWh (tokens) a mintear
    /// * `minter` - Dirección que está minteando (debe tener rol MINTER)
    #[only_role(minter, "minter")]
    pub fn mint_energy(e: &Env, to: Address, amount: i128, minter: Address) {
        e.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
        Base::mint(e, &to, amount);
    }

    /// Quema tokens cuando se consume energía
    ///
    /// # Argumentos
    /// * `from` - Dirección de la que se quemarán tokens
    /// * `amount` - Cantidad de kWh (tokens) a quemar
    pub fn burn_energy(e: &Env, from: Address, amount: i128) {
        e.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
        Base::burn(e, &from, amount);
    }

    /// Otorga rol de minter a una nueva dirección
    /// Solo puede ser llamado por el admin
    ///
    /// # Argumentos
    /// * `new_minter` - Dirección que recibirá el rol de minter
    pub fn grant_minter(e: &Env, new_minter: Address) {
        let admin = access_control::get_admin(e).expect("admin not set");
        admin.require_auth();
        e.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
        access_control::grant_role_no_auth(e, &admin, &new_minter, &symbol_short!("minter"));
    }

    /// Revoca rol de minter de una dirección
    /// Solo puede ser llamado por el admin
    ///
    /// # Argumentos
    /// * `minter` - Dirección a la que se le revocará el rol
    pub fn revoke_minter(e: &Env, minter: Address) {
        let admin = access_control::get_admin(e).expect("admin not set");
        admin.require_auth();
        e.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
        access_control::revoke_role_no_auth(e, &admin, &minter, &symbol_short!("minter"));
    }

    /// Verifica si una dirección tiene rol de minter
    pub fn is_minter(e: &Env, account: Address) -> bool {
        access_control::has_role(e, &account, &symbol_short!("minter")).is_some()
    }

    /// Obtiene el admin actual
    pub fn admin(e: &Env) -> Address {
        access_control::get_admin(e).expect("admin not set")
    }
}

// ============================================================================
// Implementaciones por defecto de OpenZeppelin
// ============================================================================

/// Implementa funciones estándar SEP-41 (transfer, balance, approve, etc.)
#[default_impl]
#[contractimpl]
impl FungibleToken for EnergyToken {
    type ContractType = Base;
}

/// Implementa funciones de quema
#[default_impl]
#[contractimpl]
impl FungibleBurnable for EnergyToken {}

/// Implementa sistema de control de acceso
#[default_impl]
#[contractimpl]
impl AccessControl for EnergyToken {}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    // Helper: creates a token contract with zero initial supply
    fn setup<'a>(env: &'a Env) -> (EnergyTokenClient<'a>, Address, Address) {
        let admin = Address::generate(env);
        let distribution = Address::generate(env);
        let contract_id = env.register(EnergyToken, (&admin, &distribution, &0i128));
        let client = EnergyTokenClient::new(env, &contract_id);
        (client, admin, distribution)
    }

    // ========================================================================
    // Constructor
    // ========================================================================

    #[test]
    fn test_initialize() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, distribution) = setup(&env);

        assert_eq!(client.name(), String::from_str(&env, "HoneyDrop"));
        assert_eq!(client.symbol(), String::from_str(&env, "HDROP"));
        assert_eq!(client.decimals(), 7);
        assert_eq!(client.total_supply(), 0);
        assert_eq!(client.admin(), admin);
        assert!(client.is_minter(&distribution));
    }

    #[test]
    fn test_initial_supply() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let distribution = Address::generate(&env);

        let contract_id = env.register(EnergyToken, (&admin, &distribution, &1000_0000000i128));
        let client = EnergyTokenClient::new(&env, &contract_id);

        assert_eq!(client.balance(&admin), 1000_0000000);
        assert_eq!(client.total_supply(), 1000_0000000);
    }

    #[test]
    fn test_zero_initial_supply_no_mint() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, _) = setup(&env);

        assert_eq!(client.balance(&admin), 0);
        assert_eq!(client.total_supply(), 0);
    }

    // ========================================================================
    // Minting
    // ========================================================================

    #[test]
    fn test_mint_energy() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, distribution) = setup(&env);
        let user = Address::generate(&env);

        client.mint_energy(&user, &100_0000000, &distribution);

        assert_eq!(client.balance(&user), 100_0000000);
        assert_eq!(client.total_supply(), 100_0000000);
    }

    #[test]
    fn test_mint_multiple_users() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, distribution) = setup(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);

        client.mint_energy(&user1, &60_0000000, &distribution);
        client.mint_energy(&user2, &40_0000000, &distribution);

        assert_eq!(client.balance(&user1), 60_0000000);
        assert_eq!(client.balance(&user2), 40_0000000);
        assert_eq!(client.total_supply(), 100_0000000);
    }

    #[test]
    fn test_mint_accumulates_balance() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, distribution) = setup(&env);
        let user = Address::generate(&env);

        client.mint_energy(&user, &50_0000000, &distribution);
        client.mint_energy(&user, &30_0000000, &distribution);

        assert_eq!(client.balance(&user), 80_0000000);
    }

    #[test]
    fn test_mint_small_amount() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, distribution) = setup(&env);
        let user = Address::generate(&env);

        // 0.0000001 kWh (1 stroop)
        client.mint_energy(&user, &1, &distribution);
        assert_eq!(client.balance(&user), 1);
    }

    // ========================================================================
    // Burning
    // ========================================================================

    #[test]
    fn test_burn_energy() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, distribution) = setup(&env);
        let user = Address::generate(&env);

        client.mint_energy(&user, &100_0000000, &distribution);
        client.burn_energy(&user, &30_0000000);

        assert_eq!(client.balance(&user), 70_0000000);
        assert_eq!(client.total_supply(), 70_0000000);
    }

    #[test]
    fn test_burn_entire_balance() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, distribution) = setup(&env);
        let user = Address::generate(&env);

        client.mint_energy(&user, &50_0000000, &distribution);
        client.burn_energy(&user, &50_0000000);

        assert_eq!(client.balance(&user), 0);
        assert_eq!(client.total_supply(), 0);
    }

    #[test]
    #[should_panic]
    fn test_burn_more_than_balance_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, distribution) = setup(&env);
        let user = Address::generate(&env);

        client.mint_energy(&user, &50_0000000, &distribution);
        client.burn_energy(&user, &51_0000000);
    }

    #[test]
    #[should_panic]
    fn test_burn_zero_balance_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, _) = setup(&env);
        let user = Address::generate(&env);

        client.burn_energy(&user, &1);
    }

    // ========================================================================
    // Transfers
    // ========================================================================

    #[test]
    fn test_transfer_between_users() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, distribution) = setup(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);

        client.mint_energy(&user1, &100_0000000, &distribution);
        client.transfer(&user1, &user2, &20_0000000);

        assert_eq!(client.balance(&user1), 80_0000000);
        assert_eq!(client.balance(&user2), 20_0000000);
    }

    #[test]
    fn test_transfer_preserves_total_supply() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, distribution) = setup(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);

        client.mint_energy(&user1, &100_0000000, &distribution);
        client.transfer(&user1, &user2, &40_0000000);

        assert_eq!(client.total_supply(), 100_0000000);
    }

    #[test]
    #[should_panic]
    fn test_transfer_more_than_balance_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, distribution) = setup(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);

        client.mint_energy(&user1, &50_0000000, &distribution);
        client.transfer(&user1, &user2, &51_0000000);
    }

    // ========================================================================
    // Access Control
    // ========================================================================

    #[test]
    fn test_grant_and_revoke_minter() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, _) = setup(&env);
        let new_minter = Address::generate(&env);

        client.grant_minter(&new_minter);
        assert!(client.is_minter(&new_minter));

        client.revoke_minter(&new_minter);
        assert!(!client.is_minter(&new_minter));
    }

    #[test]
    fn test_multiple_minters() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, distribution) = setup(&env);
        let minter2 = Address::generate(&env);
        let minter3 = Address::generate(&env);

        client.grant_minter(&minter2);
        client.grant_minter(&minter3);

        assert!(client.is_minter(&distribution));
        assert!(client.is_minter(&minter2));
        assert!(client.is_minter(&minter3));
    }

    #[test]
    fn test_non_minter_cannot_mint() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, _) = setup(&env);
        let user = Address::generate(&env);
        let not_minter = Address::generate(&env);

        // not_minter doesn't have MINTER role, should fail
        let result = client.try_mint_energy(&user, &100_0000000, &not_minter);
        assert!(result.is_err());
    }

    #[test]
    fn test_revoked_minter_cannot_mint() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, distribution) = setup(&env);
        let user = Address::generate(&env);

        client.revoke_minter(&distribution);
        assert!(!client.is_minter(&distribution));

        let result = client.try_mint_energy(&user, &100_0000000, &distribution);
        assert!(result.is_err());
    }

    #[test]
    fn test_is_minter_false_for_random_address() {
        let env = Env::default();
        let (client, _, _) = setup(&env);
        let random = Address::generate(&env);

        assert!(!client.is_minter(&random));
    }

    // ========================================================================
    // Edge Cases
    // ========================================================================

    #[test]
    fn test_balance_of_unknown_address_is_zero() {
        let env = Env::default();
        let (client, _, _) = setup(&env);
        let unknown = Address::generate(&env);

        assert_eq!(client.balance(&unknown), 0);
    }

    #[test]
    fn test_mint_then_burn_then_mint() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, distribution) = setup(&env);
        let user = Address::generate(&env);

        client.mint_energy(&user, &100_0000000, &distribution);
        client.burn_energy(&user, &100_0000000);
        client.mint_energy(&user, &50_0000000, &distribution);

        assert_eq!(client.balance(&user), 50_0000000);
        assert_eq!(client.total_supply(), 50_0000000);
    }
}
