import NuxtProtokit from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtProtokit,
  ],
  protokit: {
    serverSync: false,
  },
})
