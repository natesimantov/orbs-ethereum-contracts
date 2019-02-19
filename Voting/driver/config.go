package driver

import (
	"github.com/pkg/errors"
)

type Config struct {
	DebugLogs                 bool
	EthereumErc20Address      string
	EthereumValidatorsAddress string
	EthereumVotingAddress     string
	UserAccountOnEthereum     string
	UserAccountOnOrbs         string
	StakeHoldersNumber        int
	StakeHolderValues         []int
	ActivistsAccounts         []int
	ValidatorsAccounts        []int
	Transfers                 []*TransferEvent
	Delegates                 []*DelegateEvent
	Votes                     []*VoteEvent
}

func (config *Config) Validate(isDeploy bool) error {
	if !isDeploy {
		if config.EthereumErc20Address == "" {
			return errors.Errorf("configuration field '%s' is empty, did you forget to update it?", "EthereumErc20Address")
		}
		if config.EthereumValidatorsAddress == "" {
			return errors.Errorf("configuration field '%s' is empty, did you forget to update it?", "OrbsErc20ContractName")
		}
		if config.EthereumVotingAddress == "" {
			return errors.Errorf("configuration field '%s' is empty, did you forget to update it?", "OrbsAsbContractName")
		}
	}
	if config.UserAccountOnEthereum == "" {
		return errors.Errorf("configuration field '%s' is empty, did you forget to update it?", "UserAccountOnEthereum")
	}
	if config.UserAccountOnOrbs == "" {
		return errors.Errorf("configuration field '%s' is empty, did you forget to update it?", "UserAccountOnOrbs")
	}
	// TODO v1 add array checks ?
	if config.StakeHoldersNumber < 10 {
		return errors.Errorf("configuration field '%s' has invalid value '%d'", "StakeHoldersNumber", config.StakeHoldersNumber)
	}
	if len(config.StakeHolderValues) != config.StakeHoldersNumber {
		return errors.Errorf("configuration field '%s' has invalid length '%d'", "StakeHolderValues", len(config.StakeHolderValues))
	}
	if len(config.ActivistsAccounts) < 3 {
		return errors.Errorf("configuration field '%s' has invalid length '%d'", "ActivistsAccounts", len(config.ActivistsAccounts))
	}
	if len(config.ValidatorsAccounts) < 5 {
		return errors.Errorf("configuration field '%s' has invalid length '%d'", "ValidatorsAccounts", len(config.ValidatorsAccounts))
	}
	if config.Transfers == nil || len(config.Transfers) < 10 {
		return errors.Errorf("configuration field '%s' has invalid length '%d'", "Transfers", len(config.Transfers))
	}
	return nil
}

type DelegateEvent struct {
	FromIndex int
	ToIndex   int
}

type TransferEvent struct {
	FromIndex int
	ToIndex   int
	Amount    int
}

type VoteEvent struct {
	ActivistIndex int
	Candidates    [3]int
}
