import { expect } from 'chai';
import plugin from '../src';

describe('feathers-mongodb-management', () => {
  it('is CommonJS compatible', () => {
    expect(typeof require('../lib')).to.equal('function');
  });

  it('basic functionality', () => {
    expect(typeof plugin).to.equal('function', 'It worked');
    expect(plugin()).to.equal('feathers-mongodb-management');
  });
});
