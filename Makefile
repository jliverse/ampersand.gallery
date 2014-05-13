REPORTER = spec

test:
	@NODE_ENV=test ./node_modules/gulp/bin/gulp.js test \
		--reporter $(REPORTER) \

watch:
	@NODE_ENV=test ./node_modules/gulp/bin/gulp.js test \
		--reporter $(REPORTER) \
		--growl \
		--watch

.PHONY: test watch