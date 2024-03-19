# Anchor

Javascript client for Anchor PKI. See https://anchor.dev/ for details.

## Configuration

The Following environment variables are available to configure the default
`AutoCert`

* `HTTPS_PORT` - the TCP numerical port to bind SSL to.
* `ACME_ALLOW_IDENTIFIERS` - A comma separated list of hostnames for provisioning certs
* `ACME_DIRECTORY_URL` - the ACME provider's directory
* `ACME_KID` - your External Account Binding (EAB) KID for authenticating with the ACME directory above with an
* `ACME_HMAC_KEY` - your EAB HMAC_KEY for authenticating with the ACME directory above
* `ACME_RENEW_BEFORE_SECONDS` - **optional** Start a renewal this number number of seconds before the cert expires. This defaults to 30 days (2592000 seconds)
* `ACME_RENEW_BEFORE_FRACTION` - **optional** Start the renewal when this fraction of a certificate's valid window is left. This defaults to 0.5, which means when the cert is in the last 50% of its lifespan a renewal is attempted.
* `AUTO_CERT_CHECK_EVERY` - **optional** the number of seconds to wait between checking if the certificate has expired. This defaults to 1 hour (3600 seconds)

If both `ACME_RENEW_BEFORE_SECONDS` and `ACME_RENEW_BEFORE_FRACTION` are set,
the one that causes the renewal to take place earlier is used.

Example:

* Cert start (not_before) moment is : `2023-05-24 20:53:11 UTC`
* Cert expiration (not_after) moment is : `2023-06-21 20:53:10 UTC`
* `ACME_RENEW_BEFORE_SECONDS` is `1209600` (14 days)
* `ACME_RENEW_BEFORE_FRACTION` is `0.25` - which equates to a before seconds value of `604799` (~7 days)

The possible moments to start renewing are:

* 14 days before expiration moment - `2023-06-07 20:53:10 UTC`
* when 25% of the valid time is left - `2023-06-14 20:53:11 UTC`

Currently the `AutoCert::Manager` will use whichever is earlier.

### Example configuration

```sh
HTTPS_PORT=44300
ACME_ALLOW_IDENTIFIERS=my.lcl.host,*.my.lcl.host
ACME_DIRECTORY_URL=https://acme-v02.api.letsencrypt.org/directory
ACME_KID=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
ACME_HMAC_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## Run Tests

* All tests `yarn run test`
* With coverage `yarn run coverage`

To isolate a single test, this is all mocha - so use mocha's approach of
isolation by marking `it.only(...)`.

## Record new test recordings

This code base tests against polly.js recordings. These may need to be
regenerated periodically.

**Note: for the javascript recordings, the KID is baked into the request data.
If you regenerate the EAB token, replace the KID value in the test code (step 5
). It won't be loaded from ANCHOR_KID in the shell environment!**

1. check out the code base locally
1. go to <https://anchor.dev/autocert-cab3bc/development/x509/ca/acme>
1. In the **Server Setup** section, generate new tokens, and take note of the
   `ACME_DIRECTORY_URL` and `ACME_CONTACT` information.
1. Make a local `.env` file or similar containing:

        export ACME_DIRECTORY_URL='https://anchor.dev/autocert-cab3bc/development/x509/ca/acme'
        export ACME_CONTACT=.....
        export ACME_HMAC_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

1. Update the [test/fixtures.js](test/fixtures.js) with the newly generated `kid`
   and `hmacKey` values
1. Grep for `aae_` to see if there are any other hard-coded KIDs in the codebase.
1. on the command line execute:

        $ . .env
        $ rm -rf test/recordings
        $ yarn run test

1. commit the new recordings.
1. **DELETE THE EAB TOKENS FROM anchor.dev**, Go to <https://anchor.dev/autocert-cab3bc/development/x509/ca/crt/E476:3520:C4B8/acme>
   and delete the EAB tokens used to generate this run.


## License

The gem is available as open source under the terms of the [MIT
License](./LICENSE.txt)
