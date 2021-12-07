module.exports = {
  transpileDependencies: ["vuetify"],
  pluginOptions: {
    electronBuilder: {
      preload: { preload: 'src/preload.ts', workerPreload: 'src/workerPreload.ts' },
      productName: "Open PCA HCA"
    }
  }
}