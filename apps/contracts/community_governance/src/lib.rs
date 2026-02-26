#![no_std]

//! # Community Governance Contract
//!
//! Sistema de gobernanza comunitaria para toma de decisiones del Hive.

use soroban_sdk::{contract, contractimpl, contracterror, contracttype, Address, Env, String};

const INSTANCE_TTL_THRESHOLD: u32 = 50_000;
const INSTANCE_TTL_EXTEND_TO: u32 = 100_000;
const PERSISTENT_TTL_THRESHOLD: u32 = 50_000;
const PERSISTENT_TTL_EXTEND_TO: u32 = 200_000;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum GovernanceError {
    AlreadyInitialized = 1,
}

#[contracttype]
#[derive(Clone)]
pub struct Proposal {
    pub id: u32,
    pub title: String,
    pub proposer: Address,
    pub votes_for: u32,
    pub votes_against: u32,
}

#[contracttype]
pub enum DataKey {
    Admin,
    ProposalCount,
    Proposal(u32),
}

#[contract]
pub struct CommunityGovernance;

#[contractimpl]
impl CommunityGovernance {
    pub fn initialize(env: Env, admin: Address) -> Result<(), GovernanceError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(GovernanceError::AlreadyInitialized);
        }

        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::ProposalCount, &0u32);

        env.storage().instance().extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_EXTEND_TO);

        Ok(())
    }

    pub fn create_proposal(env: Env, proposer: Address, title: String) -> u32 {
        proposer.require_auth();
        let count: u32 = env.storage().instance().get(&DataKey::ProposalCount).unwrap_or(0);
        let id = count + 1;

        let proposal = Proposal {
            id,
            title,
            proposer,
            votes_for: 0,
            votes_against: 0,
        };

        let proposal_key = DataKey::Proposal(id);
        env.storage().persistent().set(&proposal_key, &proposal);
        env.storage().persistent().extend_ttl(&proposal_key, PERSISTENT_TTL_THRESHOLD, PERSISTENT_TTL_EXTEND_TO);

        env.storage().instance().set(&DataKey::ProposalCount, &id);
        env.storage().instance().extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_EXTEND_TO);

        id
    }

    pub fn get_proposal_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::ProposalCount).unwrap_or(0)
    }
}
