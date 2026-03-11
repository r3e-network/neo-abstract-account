const test = require('node:test');
const assert = require('node:assert/strict');

const { extractDeployedContractHash } = require('../src/deployLog');

const deployNotificationHash = 'I2TvG83PmnzR4FoFDvq3o5kYHHE=';

test('extractDeployedContractHash reads the deployed hash from management Deploy notifications', () => {
  const sampleAppLog = {
    executions: [
      {
        vmstate: 'HALT',
        notifications: [
          {
            contract: '0xfffdc93764dbaddd97c48f252a53ea4643faa3fd',
            eventname: 'Deploy',
            state: {
              type: 'Array',
              value: [
                {
                  type: 'ByteString',
                  value: deployNotificationHash,
                },
              ],
            },
          },
        ],
      },
    ],
  };

  assert.equal(
    extractDeployedContractHash(sampleAppLog),
    '0x5be915aea3ce85e4752d522632f0a9520e377aaf'
  );
});

test('extractDeployedContractHash falls back to the management deploy return stack', () => {
  const sampleAppLog = {
    executions: [
      {
        vmstate: 'HALT',
        notifications: [],
        stack: [
          {
            type: 'Array',
            value: [
              { type: 'Integer', value: '3656' },
              { type: 'Integer', value: '0' },
              { type: 'ByteString', value: deployNotificationHash },
            ],
          },
        ],
      },
    ],
  };

  assert.equal(
    extractDeployedContractHash(sampleAppLog),
    '0x5be915aea3ce85e4752d522632f0a9520e377aaf'
  );
});
