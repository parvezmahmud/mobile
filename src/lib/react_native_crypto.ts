/* eslint-disable no-bitwise */
import {
  Base64String,
  HexString,
  SNPureCrypto,
  SodiumConstant,
  StreamDecryptor,
  StreamDecryptorResult,
  StreamEncryptor,
  timingSafeEqual,
  Utf8String,
} from '@standardnotes/sncrypto-common';
import Aes from 'react-native-aes-crypto';
import * as Sodium from 'react-native-sodium-jsi';

export class SNReactNativeCrypto implements SNPureCrypto {
  deinit(): void {}
  public timingSafeEqual(a: string, b: string) {
    return timingSafeEqual(a, b);
  }

  async initialize(): Promise<void> {
    return;
  }

  pbkdf2(
    password: Utf8String,
    salt: Utf8String,
    iterations: number,
    length: number
  ): Promise<string | null> {
    return Aes.pbkdf2(password, salt, iterations, length);
  }

  public generateRandomKey(bits: number): string {
    const bytes = bits / 8;
    const result = Sodium.randombytes_buf(bytes);
    return result;
  }

  aes256CbcEncrypt(
    plaintext: Utf8String,
    iv: HexString,
    key: HexString
  ): Promise<Base64String> {
    return Aes.encrypt(plaintext, key, iv);
  }

  async aes256CbcDecrypt(
    ciphertext: Base64String,
    iv: HexString,
    key: HexString
  ): Promise<Utf8String | null> {
    try {
      return Aes.decrypt(ciphertext, key, iv);
    } catch (e) {
      return null;
    }
  }

  async hmac256(
    message: Utf8String,
    key: HexString
  ): Promise<HexString | null> {
    try {
      return Aes.hmac256(message, key);
    } catch (e) {
      return null;
    }
  }

  public async sha256(text: string): Promise<string> {
    return Aes.sha256(text);
  }

  public unsafeSha1(text: string): Promise<string> {
    return Aes.sha1(text);
  }

  public argon2(
    password: Utf8String,
    salt: HexString,
    iterations: number,
    bytes: number,
    length: number
  ): HexString {
    return Sodium.crypto_pwhash(
      length,
      password,
      salt,
      iterations,
      bytes,
      Sodium.constants.crypto_pwhash_ALG_DEFAULT
    );
  }

  xchacha20Encrypt(
    plaintext: Utf8String,
    nonce: HexString,
    key: HexString,
    assocData: Utf8String
  ): Base64String {
    return Sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      plaintext,
      nonce,
      key,
      assocData
    );
  }

  public xchacha20Decrypt(
    ciphertext: Base64String,
    nonce: HexString,
    key: HexString,
    assocData: Utf8String
  ): string | null {
    try {
      const result = Sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        ciphertext,
        nonce,
        key,
        assocData
      );
      return result;
    } catch (e) {
      return null;
    }
  }

  public xchacha20StreamInitEncryptor(key: HexString): StreamEncryptor {
    return Sodium.crypto_secretstream_xchacha20poly1305_init_push(key);
  }

  public xchacha20StreamEncryptorPush(
    encryptor: StreamEncryptor,
    plainBuffer: Uint8Array,
    assocData: Utf8String,
    tag: SodiumConstant = SodiumConstant.CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_TAG_PUSH
  ): Uint8Array {
    const encryptedBuffer = Sodium.crypto_secretstream_xchacha20poly1305_push(
      encryptor.state as never,
      plainBuffer,
      assocData,
      tag
    );
    return encryptedBuffer;
  }

  public xchacha20StreamInitDecryptor(
    header: Base64String,
    key: HexString
  ): StreamDecryptor {
    const state = Sodium.crypto_secretstream_xchacha20poly1305_init_pull(
      header,
      key
    );

    return { state };
  }

  public xchacha20StreamDecryptorPush(
    decryptor: StreamDecryptor,
    encryptedBuffer: Uint8Array,
    assocData: Utf8String
  ): StreamDecryptorResult | false {
    if (
      encryptedBuffer.length <
      SodiumConstant.CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_ABYTES
    ) {
      throw new Error('Invalid ciphertext size');
    }

    const result = Sodium.crypto_secretstream_xchacha20poly1305_pull(
      decryptor.state as never,
      encryptedBuffer,
      assocData
    );

    if ((result as unknown) === false) {
      return false;
    }

    return result;
  }

  public generateUUID() {
    const randomBuf = Sodium.randombytes_buf(16);
    const tempBuf = new Uint8Array(randomBuf.length / 2);

    for (let i = 0; i < randomBuf.length; i += 2) {
      tempBuf[i / 2] = parseInt(randomBuf.substring(i, i + 2), 16);
    }

    const buf = new Uint32Array(tempBuf.buffer);
    let idx = -1;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        idx++;
        const r = (buf[idx >> 3] >> ((idx % 8) * 4)) & 15;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  public base64Encode(text: Utf8String): string {
    return Sodium.to_base64(text);
  }

  public base64Decode(base64String: Base64String): string {
    return Sodium.from_base64(base64String);
  }

  public hmac1(): Promise<HexString | null> {
    throw new Error('hmac1 is not implemented on mobile');
  }

  public generateOtpSecret(): Promise<string> {
    throw new Error('generateOtpSecret is not implemented on mobile');
  }

  public hotpToken(): Promise<string> {
    throw new Error('hotpToken is not implemented on mobile');
  }

  public totpToken(): Promise<string> {
    throw new Error('totpToken is not implemented on mobile');
  }
}
