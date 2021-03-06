/* Generates a sitemap */
const fs = require('fs')
const path = require('path')
const sm = require('sitemap')
const globby = require('globby')

module.exports = {
  name: '@netlify/plugin-sitemap',
  onPostBuild: async ({ constants, pluginConfig, netlifyConfig }) => {
    const baseUrl = pluginConfig.baseUrl || process.env.URL
    const buildConfig = netlifyConfig.build || {}
    // Backwards compat... Correct opt is buildDir
    const buildDistOpt = pluginConfig.dir || pluginConfig.distPath || pluginConfig.buildDir
    const buildDir = buildDistOpt || buildConfig.publish || constants.BUILD_DIR
    if (!buildDir) {
      throw new Error('Sitemap plugin missing build directory value')
    }
    if (!baseUrl) {
      throw new Error('Sitemap plugin missing homepage value')
    }
    console.log('Creating sitemap from files...')
    await makeSitemap({ homepage: baseUrl, distPath: buildDir })
  },
}

async function makeSitemap(opts = {}) {
  const { distPath, fileName, homepage } = opts
  if (!distPath) {
    throw new Error('Missing distPath option')
  }
  const htmlFiles = `${distPath}/**/**.html`
  const paths = await globby([htmlFiles])
  const urls = paths.map(file => {
    const regex = new RegExp(`^${distPath}`)
    const urlPath = file.replace(regex, '')
    return {
      url: urlPath,
      changefreq: 'weekly',
      priority: 0.8,
      lastmodrealtime: true,
      lastmodfile: file,
    }
  })
  const options = {
    hostname: `${homepage.replace(/\/$/, '')}/`,
    cacheTime: 600000, // 600 sec cache period
    urls,
  }
  // Creates a sitemap object given the input configuration with URLs
  const sitemap = sm.createSitemap(options)
  // Generates XML with a callback function
  sitemap.toXML(error => {
    if (error) {
      throw error
    }
  })
  // Gives you a string containing the XML data
  const xml = sitemap.toString()
  // write sitemap to file
  const sitemapFileName = fileName || 'sitemap.xml'
  const sitemapFile = path.join(distPath, sitemapFileName)
  fs.writeFileSync(sitemapFile, xml, 'utf-8')
  console.log('Sitemap Built!', sitemapFile)
}
