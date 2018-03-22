'use strict';

var path = require('path');
var fs = require('fs');
var loaderUtils = require('loader-utils');
var SourceMap = require('source-map');

module.exports = function(source, sourceMap) {
    var query = loaderUtils.getOptions(this);

    var srcFullPath = this.resourcePath;
    var srcFileNameWithoutExtension = path.basename(srcFullPath, path.extname(srcFullPath));
    var srcDirectory = path.dirname(srcFullPath);

    this.cacheable(true);

    this.addDependency(srcFullPath);

    if (query.filename) {
        var inject = '\n\n';
        var error = false;
        // extract relative path from base:
        const relativeBase = query.context ? srcDirectory.replace(query.context, '') : '';
        const file = query.filename.replace('[File]', srcFileNameWithoutExtension).replace('[Path]', relativeBase);
        try {
            var stats = fs.statSync(path.resolve(srcDirectory, file));
            // check if file exists
            if (stats.isFile()) {
                this.addDependency(file);
                // and require
                inject += '@import "' + file + '";\n';
            } else {
                error = true;
            }
        } catch (e) {
            error = true;
        }

        inject += '\n';

        if(!error) {
            if (sourceMap) {
                var currentRequest = loaderUtils.getCurrentRequest(this);
                var SourceNode = SourceMap.SourceNode;
                var SourceMapConsumer = SourceMap.SourceMapConsumer;
                var sourceMapConsumer = new SourceMapConsumer(sourceMap);
                var node = SourceNode.fromStringWithSourceMap(source, sourceMapConsumer);

                node.append(inject);

                var result = node.toStringWithSourceMap({
                    file: currentRequest
                });

                return this.callback(null, result.code, result.map.toJSON());
            }

            return source + inject;
        }
    }

    // return the original source and sourceMap
    if (sourceMap) {
        return this.callback(null, source, sourceMap);
    }

    return source;
};
