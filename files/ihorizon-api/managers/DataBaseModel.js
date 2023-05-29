'use strict';

const superagent = require('superagent');
const config = require('../../config');
var CryptoJS = require("crypto-js");

/**
 * @extends {DataBaseModel}
 */
class DataBaseModel {
  constructor(data) {
    return new Promise((resolve, reject) => {
      /**
       * @type {string}
       */
      this.data = null;
      let encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), config.api.apiToken);

      superagent
        .post(config.api.dbApiUrl)
        .send({ text: encrypted.toString() })
        .set('accept', 'json')
        .end((err, res) => {
          if (err) {
            console.error(err);
            reject(err);
          } else {
            if (JSON.stringify(res.body) === "{}") {
              this.data = res.text;
            } else {
              this.data = res.body;
            }
            resolve(this);
          }
        });
    });
  }

  /**
   * Represents the "Set" action.
   * @returns {string}
   */
  static get Set() {
    return 1;
  }

  /**
   * Represents the "Push" action.
   * @returns {string}
   */
  static get Push() {
    return 2;
  }

  /**
   * Represents the "Sub" action.
   * @returns {string}
   */
  static get Delete() {
    return 3;
  }

  /**
   * Represents the "Add" action.
   * @returns {string}
   */
  static get Add() {
    return 4;
  }

  /**
   * Represents the "Get" action.
   * @returns {string}
   */
  static get Get() {
    return 5;
  }

  /**
   * Represents the "Pull" action.
   * @returns {string}
   */
  static get Pull() {
    return 6;
  }

  /**
   * Represents the "All" action.
   * @returns {string}
   */
  static get All() {
    return 7;
  }
}

module.exports = DataBaseModel;