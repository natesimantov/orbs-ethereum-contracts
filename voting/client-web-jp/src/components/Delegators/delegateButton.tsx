import React from 'react';
import { Tooltip, SvgIcon, IconButton } from '@material-ui/core';

const Icon = ({ color }) => {
  return (
    <SvgIcon fontSize="small" color={color}>
      <path fill="none" d="M0 0h24v24H0V0z" />
      <path d="M11 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zM5 18c.2-.63 2.57-1.68 4.96-1.94l2.04-2c-.39-.04-.68-.06-1-.06-2.67 0-8 1.34-8 4v2h9l-2-2H5zm15.6-5.5l-5.13 5.17-2.07-2.08L12 17l3.47 3.5L22 13.91z" />
    </SvgIcon>
  );
};

export const DelegateButton = ({ isDelegated, onDelegate }) => {
  return (
    <Tooltip
      placement="top"
      title={
        isDelegated
          ? 'Your vote is delegated to this guardian'
          : 'Delegate to this guardian'
      }
    >
      <IconButton onClick={onDelegate}>
        <Icon color={isDelegated ? 'secondary' : 'action'} />
      </IconButton>
    </Tooltip>
  );
};
