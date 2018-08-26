#!/usr/bin/env node
//we need the region from here so do it first
const YAML = require( 'yamljs' );
outputs = YAML.load( `./.build/stackOuts.yaml` );
const DEPLOY_REGION = outputs.Region;

const AWS = require('aws-sdk');
AWS.config.update({ region: DEPLOY_REGION });
const ssm = new AWS.SSM();

const COGNITO_IDENTITY_POOL_ID = {
  ID: 'CognitoIdentityPoolId',
  SSM: '/mpa/payer/cognito/identitypool/id'
};
const COGNITO_USER_POOL_CLIENT_ID = {
  ID: 'CognitoUserPoolClientId',
  SSM: '/mpa/payer/cognito/userpool/client/id'
};
const COGNITO_USER_POOL_ID = {
  ID: 'CognitoUserPoolId',
  SSM: '/mpa/payer/cognito/userpool/id'
};
const COGNITO_USER_POOL_ARN = {
  ID: 'CognitoUserPoolArn',
  SSM: '/mpa/payer/cognito/userpool/arn'
};
const REGION = 'Region';
//import the output from the serverless process for handling

module.exports.importer = cognitoSsmImporter;

/**
 * this expect that the identity service has been deployed and the output file is in the correct place.
 */
function cognitoSsmImporter() {
  return new Promise(( resolve, reject ) => {
    checkCognitoComponents(outputs)
    .then(result => {
      Promise.all([
        ssmUpdate(COGNITO_IDENTITY_POOL_ID),
        ssmUpdate(COGNITO_USER_POOL_CLIENT_ID),
        ssmUpdate(COGNITO_USER_POOL_ID),
        ssmUpdate(COGNITO_USER_POOL_ARN)
      ])
      .then(resultArray => {
        console.log(`ssm updates made`);
        resolve({result: "OK"});
      })
      .catch(err => {
        console.log(`error from promise all chain: `, err.message);
        reject( err )
      })
    })
    .catch(err => {
      console.log(`error checking  component : `, err.message);
      reject ( err );
    });
  })
}

function ssmUpdate( record ) {
  return new Promise(( resolve, reject ) => {
    let ssmUpdateParams = {
      Name: record.SSM,
      Type: 'SecureString',
      Value: outputs[record.ID],
      Overwrite: true
    }
    ssm.putParameter(ssmUpdateParams).promise()
      .then( result => {
        console.log( `success, parameter ${record.ID} version ${ result.Version } update successful` );
        resolve( result );
      })
      .catch( err => {
        console.log( `error writing ${record.ID} parameter to store` );
        reject( err );
      })
  })
}





/**
 * Checks the params that the build produced contains those we need
 * @param outputs
 * @returns {Promise<any>}
 */
function checkCognitoComponents( outputs ) {
  return new Promise(( resolve, reject ) => {
    if(!outputs.hasOwnProperty(COGNITO_IDENTITY_POOL_ID.ID)) {
      reject(new Error('cognito identity pool id not present'))
    } else if(!outputs.hasOwnProperty( COGNITO_USER_POOL_CLIENT_ID.ID )) {
      reject(new Error('cognito user pool client id not present'))
    } else if(!outputs.hasOwnProperty( COGNITO_USER_POOL_ID.ID )) {
      reject(new Error('cognito user pool id not present'))
    } else if(!outputs.hasOwnProperty( COGNITO_USER_POOL_ARN.ID )) {
      reject(new Error('cognito user pool ARN not present'))
    } else if(!outputs.hasOwnProperty( REGION )) {
      reject(new Error('region is not present'))
    } else {
      console.log(`all requirements present`);
      resolve({ result: "OK" });
    }
  })
};
