#![no_std]

//! # Energy Distribution Contract
//!
//! Gestiona la distribución de energía generada por paneles solares comunitarios.
//! - Registro multi-firma de miembros y sus porcentajes de propiedad
//! - Distribución automática de tokens HoneyDrop (HDROP) según generación de kWh
//! - Integración con token contract para minteo/quema
//! - Sistema de privacidad con commitments (ZK proofs simulados)

use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Address, Bytes, BytesN, Env, Vec};

mod privacy;

const INSTANCE_TTL_THRESHOLD: u32 = 50_000;
const INSTANCE_TTL_EXTEND_TO: u32 = 100_000;
const PERSISTENT_TTL_THRESHOLD: u32 = 50_000;
const PERSISTENT_TTL_EXTEND_TO: u32 = 200_000;

/// Errores del contrato de distribución de energía
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum DistributionError {
    /// No hay suficientes firmantes (se requieren más aprobaciones)
    NotEnoughApprovers = 1,
    /// La cantidad de miembros y porcentajes no coincide
    MemberPercentMismatch = 2,
    /// Los porcentajes no suman 100%
    PercentsMustSumTo100 = 3,
    /// Los miembros aún no han sido inicializados
    MembersNotInitialized = 4,
    /// El contrato ya fue inicializado
    AlreadyInitialized = 5,
}

#[contracttype]
#[derive(Clone)]
pub struct Member {
    pub address: Address,
    pub percent: u32,
}

#[contracttype]
pub enum DataKey {
    Admin,
    TokenContract,          // Dirección del contrato de HoneyDrop
    RequiredApprovals,
    MembersInitialized,
    Member(Address),
    MemberPercent(Address),
    MemberList,             // Lista de todas las direcciones de miembros
    TotalGenerated,         // Total de kWh generados históricamente
    PrivacyEnabled,         // Si el modo de privacidad está habilitado
    UserCommitment(Address), // Commitment de consumo privado por usuario
}

#[contract]
pub struct EnergyDistribution;

// Interface del token contract (solo las funciones que necesitamos)
mod energy_token_interface {
    use soroban_sdk::{contractclient, Address, Env};

    #[contractclient(name = "EnergyTokenClient")]
    pub trait EnergyTokenTrait {
        /// Mintea tokens de energía a una dirección
        fn mint_energy(env: Env, to: Address, amount: i128, minter: Address);
    }
}

#[contractimpl]
impl EnergyDistribution {
    /// Inicializa el contrato de distribución
    ///
    /// # Argumentos
    /// * `admin` - Administrador del contrato
    /// * `token_contract` - Dirección del contrato HoneyDrop (HDROP)
    /// * `required_approvals` - Número de firmas requeridas para agregar miembros
    pub fn initialize(env: Env, admin: Address, token_contract: Address, required_approvals: u32) -> Result<(), DistributionError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(DistributionError::AlreadyInitialized);
        }

        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::TokenContract, &token_contract);
        env.storage()
            .instance()
            .set(&DataKey::RequiredApprovals, &required_approvals);
        env.storage()
            .instance()
            .set(&DataKey::MembersInitialized, &false);
        env.storage()
            .instance()
            .set(&DataKey::TotalGenerated, &0i128);

        env.storage().instance().extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_EXTEND_TO);

        Ok(())
    }

    /// Agrega miembros con multi-firma
    ///
    /// # Argumentos
    /// * `approvers` - Lista de aprobadores que firman la transacción
    /// * `members` - Lista de direcciones de miembros
    /// * `percents` - Lista de porcentajes de propiedad (deben sumar 100)
    pub fn add_members_multisig(
        env: Env,
        approvers: Vec<Address>,
        members: Vec<Address>,
        percents: Vec<u32>,
    ) -> Result<(), DistributionError> {
        // Verificar que hay suficientes aprobadores
        let required: u32 = env
            .storage()
            .instance()
            .get(&DataKey::RequiredApprovals)
            .unwrap();

        if approvers.len() < required {
            return Err(DistributionError::NotEnoughApprovers);
        }

        // Requerir autenticación de todos los aprobadores
        for approver in approvers.iter() {
            approver.require_auth();
        }

        // Verificar que members y percents tienen la misma longitud
        if members.len() != percents.len() {
            return Err(DistributionError::MemberPercentMismatch);
        }

        // Verificar que los porcentajes suman 100
        let total: u32 = percents.iter().sum();
        if total != 100 {
            return Err(DistributionError::PercentsMustSumTo100);
        }

        // Crear lista de miembros
        let mut member_list: Vec<Address> = Vec::new(&env);

        // Guardar miembros y sus porcentajes en persistent storage
        for i in 0..members.len() {
            let member = members.get(i).unwrap();
            let percent = percents.get(i).unwrap();

            let member_key = DataKey::Member(member.clone());
            let percent_key = DataKey::MemberPercent(member.clone());

            env.storage()
                .persistent()
                .set(&member_key, &true);
            env.storage()
                .persistent()
                .set(&percent_key, &percent);

            env.storage().persistent().extend_ttl(&member_key, PERSISTENT_TTL_THRESHOLD, PERSISTENT_TTL_EXTEND_TO);
            env.storage().persistent().extend_ttl(&percent_key, PERSISTENT_TTL_THRESHOLD, PERSISTENT_TTL_EXTEND_TO);

            member_list.push_back(member);
        }

        // Guardar lista de miembros (instance — shared config)
        env.storage()
            .instance()
            .set(&DataKey::MemberList, &member_list);

        env.storage()
            .instance()
            .set(&DataKey::MembersInitialized, &true);

        env.storage().instance().extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_EXTEND_TO);

        Ok(())
    }

    /// Registra generación de energía y distribuye tokens HoneyDrop
    ///
    /// # Argumentos
    /// * `kwh_generated` - Cantidad de kWh generados (con 7 decimales, ej: 100_0000000 = 100 kWh)
    ///
    /// Esta función:
    /// 1. Calcula cuántos tokens le corresponden a cada miembro según su %
    /// 2. Mintea tokens HoneyDrop a cada miembro
    /// 3. Actualiza el total generado
    pub fn record_generation(env: Env, kwh_generated: i128) -> Result<(), DistributionError> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        // Verificar que los miembros estén inicializados
        let initialized: bool = env
            .storage()
            .instance()
            .get(&DataKey::MembersInitialized)
            .unwrap_or(false);

        if !initialized {
            return Err(DistributionError::MembersNotInitialized);
        }

        // Obtener el contrato del token
        let token_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenContract)
            .unwrap();

        // Obtener lista de miembros
        let member_list: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::MemberList)
            .unwrap();

        // Crear cliente del token
        let token_client = energy_token_interface::EnergyTokenClient::new(&env, &token_contract);

        // Distribuir tokens a cada miembro según su porcentaje
        for i in 0..member_list.len() {
            let member = member_list.get(i).unwrap();
            let percent_key = DataKey::MemberPercent(member.clone());
            let percent: u32 = env
                .storage()
                .persistent()
                .get(&percent_key)
                .unwrap();

            env.storage().persistent().extend_ttl(&percent_key, PERSISTENT_TTL_THRESHOLD, PERSISTENT_TTL_EXTEND_TO);

            // Calcular tokens a mintear: (kwh_generated * percent) / 100
            let tokens_to_mint = (kwh_generated * percent as i128) / 100;

            // Mintear tokens al miembro
            // El contrato de distribución debe tener rol de MINTER en el token contract
            token_client.mint_energy(&member, &tokens_to_mint, &env.current_contract_address());
        }

        // Actualizar total generado
        let current_total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalGenerated)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalGenerated, &(current_total + kwh_generated));

        env.storage().instance().extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_EXTEND_TO);

        Ok(())
    }

    // ========================================================================
    // Privacy Functions (ZK Proof Simulation)
    // ========================================================================

    /// Habilita el modo de privacidad
    /// Solo puede ser llamado por el admin
    pub fn enable_privacy(env: Env) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        env.storage().instance().set(&DataKey::PrivacyEnabled, &true);
        env.storage().instance().extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_EXTEND_TO);
    }

    /// Registra consumo de forma privada usando un commitment
    ///
    /// # Privacidad:
    /// En lugar de revelar la cantidad exacta consumida, el usuario
    /// envía un "commitment" (hash) que prueba que consumió energía
    /// sin revelar cuánto.
    ///
    /// # Argumentos
    /// * `user` - Usuario que consumió energía
    /// * `commitment` - Hash del consumo (SHA256 de: address + kwh + secret)
    ///
    /// # Cómo funciona:
    /// 1. Usuario genera commitment off-chain: hash(address + consumed_kwh + secret)
    /// 2. Envía commitment al contrato
    /// 3. Contrato almacena el commitment sin conocer la cantidad
    /// 4. Para demostrar consumo, usuario puede revelar datos más tarde
    ///
    /// # Para Producción:
    /// Reemplazar con ZK-SNARKs reales (Groth16) que permitan verificar
    /// matemáticamente sin necesidad de revelar los datos.
    pub fn record_private_consumption(
        env: Env,
        user: Address,
        commitment: BytesN<32>,
    ) -> Result<(), DistributionError> {
        user.require_auth();

        // Verificar que privacidad esté habilitada
        let privacy_enabled: bool = env
            .storage()
            .instance()
            .get(&DataKey::PrivacyEnabled)
            .unwrap_or(false);

        if !privacy_enabled {
            // Si privacidad no está habilitada, podría fallar o simplemente ignorar
            // Para la demo, lo permitimos igual
        }

        // Verificar que sea miembro
        let is_member: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Member(user.clone()))
            .unwrap_or(false);

        if !is_member {
            return Err(DistributionError::MembersNotInitialized);
        }

        // Almacenar commitment en persistent storage (per-user)
        let commitment_key = DataKey::UserCommitment(user.clone());
        env.storage()
            .persistent()
            .set(&commitment_key, &commitment);
        env.storage().persistent().extend_ttl(&commitment_key, PERSISTENT_TTL_THRESHOLD, PERSISTENT_TTL_EXTEND_TO);

        Ok(())
    }

    /// Verifica un commitment de consumo privado
    ///
    /// NOTA: Esta función es solo para demostración.
    /// En un sistema ZK real, NO necesitaríamos pasar user_data porque
    /// el proof matemático se verificaría sin revelar información.
    ///
    /// # Argumentos
    /// * `user` - Usuario cuyo commitment se verifica
    /// * `user_data` - Datos originales (solo para demo, revelaría info en prod)
    pub fn verify_private_consumption(
        env: Env,
        user: Address,
        user_data: Bytes,
    ) -> bool {
        // Obtener commitment almacenado
        let stored_commitment: Option<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::UserCommitment(user));

        match stored_commitment {
            Some(commitment) => {
                // Verificar usando el módulo de privacidad
                privacy::verify_commitment(&env, &commitment, &user_data)
            }
            None => false,
        }
    }

    /// Helper: Genera commitment off-chain (para testing/frontend)
    ///
    /// En producción, esto se haría completamente off-chain en el frontend
    /// con SnarkJS para generar ZK proofs reales.
    pub fn generate_commitment_helper(
        env: Env,
        user_address_bytes: BytesN<32>,
        consumed_kwh: i128,
        secret: BytesN<32>,
    ) -> BytesN<32> {
        let user_data = privacy::hash_consumption_data(
            &env,
            &user_address_bytes,
            consumed_kwh,
            &secret,
        );

        privacy::generate_commitment(&env, &user_data)
    }

    // ========================================================================
    // View Functions
    // ========================================================================

    pub fn is_member(env: Env, address: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Member(address))
            .unwrap_or(false)
    }

    pub fn get_member_percent(env: Env, address: Address) -> Option<u32> {
        env.storage()
            .persistent()
            .get(&DataKey::MemberPercent(address))
    }

    pub fn get_admin(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::Admin)
    }

    pub fn get_token_contract(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::TokenContract)
    }

    pub fn get_required_approvals(env: Env) -> Option<u32> {
        env.storage().instance().get(&DataKey::RequiredApprovals)
    }

    pub fn are_members_initialized(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::MembersInitialized)
            .unwrap_or(false)
    }

    pub fn get_total_generated(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalGenerated)
            .unwrap_or(0)
    }

    pub fn get_member_list(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::MemberList)
            .unwrap_or_else(|| Vec::new(&env))
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, vec, Bytes, BytesN, Env};

    // Helper: register distribution contract and initialize
    fn setup<'a>(env: &'a Env) -> (EnergyDistributionClient<'a>, Address, Address) {
        let contract_id = env.register(EnergyDistribution, ());
        let client = EnergyDistributionClient::new(env, &contract_id);
        let admin = Address::generate(env);
        let token_contract = Address::generate(env);
        let _ = client.try_initialize(&admin, &token_contract, &3).unwrap();
        (client, admin, token_contract)
    }

    // Helper: setup with members registered (2 members: 60%/40%)
    fn setup_with_members<'a>(env: &'a Env) -> (EnergyDistributionClient<'a>, Address, Address, Address, Address) {
        let (client, admin, token_contract) = setup(env);
        let member1 = Address::generate(env);
        let member2 = Address::generate(env);
        let approvers = vec![env, member1.clone(), member2.clone(), admin.clone()];
        let members = vec![env, member1.clone(), member2.clone()];
        let percents = vec![env, 60, 40];
        client.add_members_multisig(&approvers, &members, &percents);
        (client, admin, token_contract, member1, member2)
    }

    // ========================================================================
    // Initialization
    // ========================================================================

    #[test]
    fn test_initialize() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(EnergyDistribution, ());
        let client = EnergyDistributionClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let token_contract = Address::generate(&env);

        let result = client.try_initialize(&admin, &token_contract, &3);
        assert!(result.is_ok());

        assert_eq!(client.get_admin(), Some(admin.clone()));
        assert_eq!(client.get_token_contract(), Some(token_contract.clone()));
        assert_eq!(client.get_required_approvals(), Some(3));
        assert!(!client.are_members_initialized());
        assert_eq!(client.get_total_generated(), 0);
    }

    #[test]
    fn test_reinitialize_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, token_contract) = setup(&env);

        let result = client.try_initialize(&admin, &token_contract, &5);
        assert!(result.is_err());
    }

    // ========================================================================
    // Add Members Multisig
    // ========================================================================

    #[test]
    fn test_add_members_multisig_success() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, _) = setup(&env);

        let m1 = Address::generate(&env);
        let m2 = Address::generate(&env);
        let m3 = Address::generate(&env);

        let approvers = vec![&env, m1.clone(), m2.clone(), admin.clone()];
        let members = vec![&env, m1.clone(), m2.clone(), m3.clone()];
        let percents = vec![&env, 50, 30, 20];

        let result = client.try_add_members_multisig(&approvers, &members, &percents);
        assert!(result.is_ok());

        assert!(client.is_member(&m1));
        assert!(client.is_member(&m2));
        assert!(client.is_member(&m3));
        assert_eq!(client.get_member_percent(&m1), Some(50));
        assert_eq!(client.get_member_percent(&m2), Some(30));
        assert_eq!(client.get_member_percent(&m3), Some(20));
        assert!(client.are_members_initialized());
        assert_eq!(client.get_member_list().len(), 3);
    }

    #[test]
    fn test_add_members_not_enough_approvers() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, _) = setup(&env); // requires 3 approvers

        let m1 = Address::generate(&env);
        let m2 = Address::generate(&env);

        // Only 2 approvers, need 3
        let approvers = vec![&env, m1.clone(), m2.clone()];
        let members = vec![&env, m1.clone(), m2.clone()];
        let percents = vec![&env, 60, 40];

        let result = client.try_add_members_multisig(&approvers, &members, &percents);
        assert_eq!(result, Err(Ok(DistributionError::NotEnoughApprovers)));
    }

    #[test]
    fn test_add_members_percent_mismatch() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, _) = setup(&env);

        let m1 = Address::generate(&env);
        let m2 = Address::generate(&env);

        let approvers = vec![&env, m1.clone(), m2.clone(), admin.clone()];
        let members = vec![&env, m1.clone(), m2.clone()];
        let percents = vec![&env, 60u32]; // 1 percent for 2 members

        let result = client.try_add_members_multisig(&approvers, &members, &percents);
        assert_eq!(result, Err(Ok(DistributionError::MemberPercentMismatch)));
    }

    #[test]
    fn test_add_members_percents_not_100() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, _) = setup(&env);

        let m1 = Address::generate(&env);
        let m2 = Address::generate(&env);

        let approvers = vec![&env, m1.clone(), m2.clone(), admin.clone()];
        let members = vec![&env, m1.clone(), m2.clone()];
        let percents = vec![&env, 60, 30]; // sums to 90, not 100

        let result = client.try_add_members_multisig(&approvers, &members, &percents);
        assert_eq!(result, Err(Ok(DistributionError::PercentsMustSumTo100)));
    }

    #[test]
    fn test_single_member_100_percent() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, _) = setup(&env);

        let m1 = Address::generate(&env);
        let a2 = Address::generate(&env);
        let a3 = Address::generate(&env);

        let approvers = vec![&env, m1.clone(), a2.clone(), a3.clone()];
        let members = vec![&env, m1.clone()];
        let percents = vec![&env, 100u32];

        let result = client.try_add_members_multisig(&approvers, &members, &percents);
        assert!(result.is_ok());
        assert_eq!(client.get_member_percent(&m1), Some(100));
    }

    // ========================================================================
    // Record Generation (cross-contract)
    // ========================================================================

    #[test]
    fn test_record_generation_without_members_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, _) = setup(&env);

        let result = client.try_record_generation(&100_0000000);
        assert_eq!(result, Err(Ok(DistributionError::MembersNotInitialized)));
    }

    #[test]
    fn test_total_generated_starts_at_zero() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, _) = setup(&env);

        assert_eq!(client.get_total_generated(), 0);
    }

    // ========================================================================
    // Privacy Functions
    // ========================================================================

    #[test]
    fn test_enable_privacy() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, _, _, _) = setup_with_members(&env);

        // enable_privacy should not panic
        client.enable_privacy();
    }

    #[test]
    fn test_record_private_consumption_non_member_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, _, _, _) = setup_with_members(&env);

        let non_member = Address::generate(&env);
        let commitment = BytesN::from_array(&env, &[1u8; 32]);

        let result = client.try_record_private_consumption(&non_member, &commitment);
        assert_eq!(result, Err(Ok(DistributionError::MembersNotInitialized)));
    }

    #[test]
    fn test_record_private_consumption_member_succeeds() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, _, member1, _) = setup_with_members(&env);

        let commitment = BytesN::from_array(&env, &[1u8; 32]);

        let result = client.try_record_private_consumption(&member1, &commitment);
        assert!(result.is_ok());
    }

    #[test]
    fn test_verify_private_consumption_valid() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, _, member1, _) = setup_with_members(&env);

        let commitment = client.generate_commitment_helper(
            &BytesN::from_array(&env, &[1u8; 32]),
            &100_0000000,
            &BytesN::from_array(&env, &[2u8; 32]),
        );

        // Store commitment
        client.record_private_consumption(&member1, &commitment);

        // Verify with matching data
        let data = privacy::hash_consumption_data(
            &env,
            &BytesN::from_array(&env, &[1u8; 32]),
            100_0000000,
            &BytesN::from_array(&env, &[2u8; 32]),
        );
        let is_valid = client.verify_private_consumption(&member1, &data);
        assert!(is_valid);
    }

    #[test]
    fn test_verify_private_consumption_invalid() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, _, member1, _) = setup_with_members(&env);

        let commitment = client.generate_commitment_helper(
            &BytesN::from_array(&env, &[1u8; 32]),
            &100_0000000,
            &BytesN::from_array(&env, &[2u8; 32]),
        );

        client.record_private_consumption(&member1, &commitment);

        // Verify with wrong data
        let wrong_data = Bytes::from_array(&env, &[9u8; 80]);
        let is_valid = client.verify_private_consumption(&member1, &wrong_data);
        assert!(!is_valid);
    }

    #[test]
    fn test_verify_no_commitment_returns_false() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, _, member1, _) = setup_with_members(&env);

        let data = Bytes::from_array(&env, &[1u8; 80]);
        let is_valid = client.verify_private_consumption(&member1, &data);
        assert!(!is_valid);
    }

    #[test]
    fn test_commitment_overwrite() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, _, member1, _) = setup_with_members(&env);

        let commitment1 = BytesN::from_array(&env, &[1u8; 32]);
        let commitment2 = BytesN::from_array(&env, &[2u8; 32]);

        client.record_private_consumption(&member1, &commitment1);
        client.record_private_consumption(&member1, &commitment2);

        // Old commitment data should not verify
        let data1 = Bytes::from_array(&env, &[1u8; 80]);
        assert!(!client.verify_private_consumption(&member1, &data1));
    }

    // ========================================================================
    // View Functions
    // ========================================================================

    #[test]
    fn test_is_member_false_for_non_member() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, _, _, _) = setup_with_members(&env);

        let outsider = Address::generate(&env);
        assert!(!client.is_member(&outsider));
    }

    #[test]
    fn test_get_member_percent_none_for_non_member() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, _, _, _) = setup_with_members(&env);

        let outsider = Address::generate(&env);
        assert_eq!(client.get_member_percent(&outsider), None);
    }

    #[test]
    fn test_member_list_empty_before_init() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _, _) = setup(&env);

        assert_eq!(client.get_member_list().len(), 0);
    }

    #[test]
    fn test_views_before_initialize() {
        let env = Env::default();
        let contract_id = env.register(EnergyDistribution, ());
        let client = EnergyDistributionClient::new(&env, &contract_id);

        assert_eq!(client.get_admin(), None);
        assert_eq!(client.get_token_contract(), None);
        assert_eq!(client.get_required_approvals(), None);
        assert!(!client.are_members_initialized());
        assert_eq!(client.get_total_generated(), 0);
    }
}
