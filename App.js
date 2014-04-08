Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    items: [
        {xtype: 'container', itemId: 'choosers', flex: 1, layout: 'hbox', padding: 10},
        {xtype: 'container', itemId: 'buttons', flex: 1, layout: 'hbox'},
        {xtype: 'container', itemId: 'status', flex: 1}
    ],

    _tagPicker: null,
    _featurePicker: null,
    _typeFeature: "/PortfolioItem/Feature",

    _selectedFeatures: [],
    _selectedTags: [],
    _selectedTagNames: [],
    _selectedTagsByName: {},
    _nullOutTagsFlag: false,
    _statusContent: null,

    _hydratedFeatures: [],
    _storiesCollectionOids: [],
    _hydratedStories: [],
    _storyTasksCollectionOids: [],
    _hydratedStoryTasks: [],
    _storyDefectsCollectionOids: [],
    _hydratedStoryDefects: [],
    _defectTasksCollectionOids: [],
    _hydratedDefectTasks: [],
    _hydratedArtifactsByOid: {},
    _artifactTagsByOid: {},

    launch: function() {
        this._getPITypes();
    },

    _buildUI: function() {

        var me = this;

        this._featurePicker = Ext.create('Rally.ui.picker.MultiObjectPicker', {
            fieldLabel: 'Choose a Feature',
            modelType: this._typeFeature
        });
        this.down("#choosers").add(this._featurePicker);

        this._tagPicker = Ext.create('Rally.ui.picker.TagPicker', {
            fieldLabel: 'Select Tags',
            autoExpand: false
        });
        this.down('#choosers').add(this._tagPicker);

        this.down('#buttons').add({
            xtype: 'rallybutton',
            text: 'Apply Tags to Feature Hierarchy',
            handler: function() {
                me._nullOutExistingData();
                me._hydrateData();
            }
        });
    },

    _getPITypes: function() {

        console.log('_getPITypes');
        var me = this;

        var piDataStore = Ext.create('Rally.data.wsapi.Store', {
            model: 'TypeDefinition',
            autoLoad: true,
            fetch: true,
            listeners: {
                scope: this,
                load: me._PITypeStoreLoaded
            },
            filters: [
                {
                    property: 'Parent.Name',
                    operator: '=',
                    value: 'Portfolio Item'
                },
                {
                    property: 'Ordinal',
                    operator: '=',
                    value: 0
                }
            ]
        });
    },

    _PITypeStoreLoaded: function(store, records) {
        this._typeFeature = records[0].get('TypePath').toLowerCase();
        this._buildUI();
    },

    _getSelectedFeatures: function() {
        this._selectedFeatures = this._featurePicker._getRecordValue();
    },

    _getSelectedTags: function() {
        var me = this;
        me._selectedTags = me._tagPicker._getRecordValue();
        Ext.Array.each(me._selectedTags, function(tag){
            var tagName = tag.get('Name');
            me._selectedTagsByName[tagName] = tag;
            me._selectedTagNames.push(tagName);
        });
    },

    _nullOutExistingData: function() {
        var me = this;
        me._hydratedFeatures = [];
        me._storiesCollectionOids = [];
        me._hydratedStories = [];
        me._storyTasksCollectionOids = [];
        me._hydratedStoryTasks = [];
        me._storyDefectsCollectionOids = [];
        me._hydratedStoryDefects = [];
        me._defectTasksCollectionOids = [];
        me._hydratedDefectTasks = [];
        me._hydratedArtifactsByOid = {};
        me._artifactTagsByOid = {};
    },

    _hydrateData: function() {

        var me = this;
        me._getSelectedFeatures();
        me._getSelectedTags();

        if (me._selectedFeatures.length === 0) {
            me._noSelectionsNotify();
            return;
        }

        if (me._selectedTags.length === 0) {
            console.log("No Selected Tags");
            me._nullOutTagsFlag = true;
        }

        var hydrateFeaturesPromise = function() {
            return me._hydrateFeatures(me);
        };

        var getStoriesCollectionPromise = function() {
            return me._getStoriesCollection(me);
        };

        var hydrateStoriesPromise = function() {
            return me._hydrateStories(me);
        };

        var getStoryTasksCollectionPromise = function() {
            return me._getStoryTaskCollections(me);
        };

        var hydrateStoryTasksPromise = function() {
            return me._hydrateStoryTasks(me);
        };

        var getStoryDefectsCollectionPromise = function() {
            return me._getStoryDefectsCollection(me);
        };

        var hydrateStoryDefectsPromise = function() {
            return me._hydrateStoryDefects(me);
        };

        var getDefectTasksCollectionPromise = function() {
            return me._getDefectTaskCollections(me);
        };

        var hydrateDefectTasksPromise = function() {
            return me._hydrateDefectTasks(me);
        };

        var combineHydratedArtifactsPromise = function() {
            return me._combineHydratedArtifacts(me);
        };

        var hydrateAllArtifactTagsPromise = function() {
            return me._hydrateAllArtifactTags(me);
        };

        var tagAllArtifactsPromise = function() {
            return me._tagAllArtifacts(me);
        };

        var promises = [
            hydrateFeaturesPromise,
            getStoriesCollectionPromise,
            hydrateStoriesPromise,
            getStoryTasksCollectionPromise,
            hydrateStoryTasksPromise,
            getStoryDefectsCollectionPromise,
            hydrateStoryDefectsPromise,
            getDefectTasksCollectionPromise,
            hydrateDefectTasksPromise,
            combineHydratedArtifactsPromise,
            hydrateAllArtifactTagsPromise,
            tagAllArtifactsPromise
        ];

        Deft.Chain.sequence(promises).then({
            scope: this,
            success: function(records) {
            },
            failure: function(error) {
                deferred.reject("Problem resolving chain " + error);
            }
        });
    },

    _hydrateFeatures: function(scope) {
        console.log('_hydrateFeatures');
        var me = scope;
        var promises = [];
        var deferred = Ext.create('Deft.Deferred');
        Ext.Array.each(me._selectedFeatures, function(feature) {
            console.log(feature.get('_stories'));
            promises.push(me._hydrateArtifact(feature.get('ObjectID'), me._typeFeature, me));
        });

        Deft.Promise.all(promises).then({
            success: function(results) {
                me._hydratedFeatures = results;
                deferred.resolve(results);
            }
        });
        return deferred;
    },

    _hydrateStories: function(scope) {
        console.log('_hydrateStories');
        var me = scope;
        var promises = [];
        var deferred = Ext.create('Deft.Deferred');

        if (me._storiesCollectionOids.length > 0) {
            Ext.Array.each(me._storiesCollectionOids, function(storyOid) {
                promises.push(me._hydrateArtifact(storyOid, 'HierarchicalRequirement', me));
            });

            Deft.Promise.all(promises).then({
                success: function(results) {
                    me._hydratedStories = results;
                    deferred.resolve([]);
                }
            });
        } else {
            deferred.resolve([]);
        }
        return deferred;
    },

    _hydrateStoryTasks: function(scope) {
        console.log('_hydrateStoryTasks');
        var me = scope;
        var promises = [];
        var deferred = Ext.create('Deft.Deferred');

        if (me._storyTasksCollectionOids.length > 0) {
            Ext.Array.each(me._storyTasksCollectionOids, function(taskOid) {
                promises.push(me._hydrateArtifact(taskOid, 'Task', me));
            });

            Deft.Promise.all(promises).then({
                success: function(results) {
                    me._hydratedStoryTasks = results;
                    console.log(results);
                    deferred.resolve([]);
                }
            });
        } else {
            deferred.resolve([]);
        }

        return deferred;
    },

    _getStoriesCollection: function(scope) {
        console.log('_getStoriesCollection');
        var me = scope;
        var promises = [];
        var deferred = Ext.create('Deft.Deferred');
        Ext.Array.each(me._hydratedFeatures, function(feature) {
            promises.push(me._hydrateArtifactCollection(feature, 'UserStories', me, me._storiesCollectionOids));
        });

        Deft.Promise.all(promises).then({
            success: function(results) {
                console.log('_getStoriesCollection Resolve');
                console.log(results);
                deferred.resolve(results);
            }
        });

        return deferred;
    },

    _getStoryTaskCollections: function(scope) {
        console.log('_getStoryTaskCollections');
        var me = scope;
        var promises = [];
        var deferred = Ext.create('Deft.Deferred');

        if (me._hydratedStories.length > 0) {
            Ext.Array.each(me._hydratedStories, function(story) {
                promises.push(me._hydrateArtifactCollection(story, 'Tasks', me, me._storyTasksCollectionOids));
            });

            Deft.Promise.all(promises).then({
                success: function(results) {
                    console.log('_getStoryTaskCollections Resolve');
                    console.log(results);
                    deferred.resolve([]);
                }
            });
        } else { deferred.resolve([]); }

        return deferred;
    },

    _getStoryDefectsCollection: function(scope) {
        console.log('_getStoryDefectsCollection');
        var me = scope;
        var promises = [];
        var deferred = Ext.create('Deft.Deferred');

        if (me._hydratedStories.length > 0) {
            Ext.Array.each(me._hydratedStories, function(story) {
                promises.push(me._hydrateArtifactCollection(story, 'Defects', me, me._storyDefectsCollectionOids));
            });

            Deft.Promise.all(promises).then({
                success: function(results) {
                    console.log('_getStoryDefectsCollection Resolve');
                    console.log(results);
                    deferred.resolve([]);
                }
            });
        } else { deferred.resolve([]); }

        return deferred;
    },

    _hydrateStoryDefects: function(scope) {
        console.log('_hydrateStoryDefects');
        var me = scope;
        var promises = [];
        var deferred = Ext.create('Deft.Deferred');

        if (me._storyDefectsCollectionOids.length > 0) {
            Ext.Array.each(me._storyDefectsCollectionOids, function(defectOid) {
                promises.push(me._hydrateArtifact(defectOid, 'Defect', me));
            });

            Deft.Promise.all(promises).then({
                success: function(results) {
                    me._hydratedStoryDefects = results;
                    console.log(results);
                    deferred.resolve([]);
                }
            });
        } else {
            deferred.resolve([]);
        }
        return deferred;
    },

    _getDefectTaskCollections: function(scope) {
        console.log('_getDefectTaskCollections');
        var me = scope;
        var promises = [];
        var deferred = Ext.create('Deft.Deferred');

        if (me._hydratedStoryDefects.length > 0) {
            Ext.Array.each(me._hydratedStoryDefects, function(defect) {
                promises.push(me._hydrateArtifactCollection(defect, 'Tasks', me, me._defectTasksCollectionOids));
            });

            Deft.Promise.all(promises).then({
                success: function(results) {
                    console.log('_getDefectTaskCollections Resolve');
                    console.log(results);
                    deferred.resolve([]);
                }
            });
        } else { deferred.resolve([]); }

        return deferred;
    },

    _hydrateDefectTasks: function(scope) {
        console.log('_hydrateStoryTasks');
        var me = scope;
        var promises = [];
        var deferred = Ext.create('Deft.Deferred');

        if (me._defectTasksCollectionOids.length > 0) {
            Ext.Array.each(me._defectTasksCollectionOids, function(taskOid) {
                promises.push(me._hydrateArtifact(taskOid, 'Task', me));
            });

            Deft.Promise.all(promises).then({
                success: function(results) {
                    me._hydratedDefectTasks = results;
                    console.log(results);
                    deferred.resolve([]);
                }
            });
        } else {
            deferred.resolve([]);
        }
        return deferred;
    },

    _hydrateArtifactCollection: function(artifact, collectionName, scope, oidsArray) {
        console.log('_hydrateArtifactCollection');
        var deferred                = Ext.create('Deft.Deferred');
        var me                      = scope;
        console.log(me);

        var artifactRef             = artifact.get('_ref');
        console.log(artifactRef);
        var artifactObjectID        = artifact.get('ObjectID');
        var artifactFormattedID     = artifact.get('FormattedID');
        var artifactName            = artifact.get('Name');

        var artifactCollection          = artifact.getCollection(collectionName,
                                            {fetch: ['Name', 'FormattedID', 'ObjectID', 'Tags']});
        var collectionCount             = artifactCollection.getCount();

        artifactCollection.load({
            callback: function(records, operation, success) {
                Ext.Array.each(records, function(record) {
                    console.log("artifactCollection.load");
                    console.log(record.get("ObjectID"));
                    oidsArray.push(record.get("ObjectID"));
                });
                deferred.resolve([]);
            }
        });
        return deferred;
    },

    _hydrateArtifact: function(artifactOid, type, scope) {
        console.log('_hydrateArtifact');
        console.log(artifactOid);
        var deferred = Ext.create('Deft.Deferred');
        var me = scope;

        var featureModel = Rally.data.ModelFactory.getModel({
            type: type,
            scope: this,
            success: function(model, operation) {
                model.load(artifactOid, {
                    scope: this,
                    success: function(record, operation) {
                        deferred.resolve(record);
                    }
                });
            }
        });
        return deferred;
    },

    _combineHydratedArtifacts: function(scope) {
        console.log('_combineHydratedArtifacts');
        var me = scope;

        Ext.Array.each(me._hydratedFeatures, function(feature){
            var oid = feature.get('ObjectID');
            me._hydratedArtifactsByOid[oid] = feature;
        });

        Ext.Array.each(me._hydratedStories, function(story) {
            var oid = story.get('ObjectID');
            me._hydratedArtifactsByOid[oid] = story;
        });

        Ext.Array.each(me._hydratedStoryTasks, function(task) {
            var oid = task.get('ObjectID');
            me._hydratedArtifactsByOid[oid] = task;
        });

        Ext.Array.each(me._hydratedStoryDefects, function(defect) {
            var oid = defect.get('ObjectID');
            me._hydratedArtifactsByOid[oid] = defect;
        });

        Ext.Array.each(me._hydratedStoryDefects, function(task) {
            var oid = task.get('ObjectID');
            me._hydratedArtifactsByOid[oid] = task;
        });

        console.log(me._hydratedArtifactsByOid);
    },

    _hydrateAllArtifactTags: function(scope) {
        console.log('_hydrateAllArtifactTags');
        var me = scope;
        var deferred = Ext.create('Deft.Deferred');
        var promises = [];

        Ext.iterate(me._hydratedArtifactsByOid, function(key, value) {
            promises.push(me._hydrateArtifactTags(key, me));
        });

        Deft.Promise.all(promises).then({
            success: function(results) {
                console.log(me._artifactTagsByOid);
                deferred.resolve([]);
            }
        });
        return deferred;
    },

    _hydrateArtifactTags: function(artifactOid, scope) {
        console.log('_hydrateArtifactTags');
        var deferred                = Ext.create('Deft.Deferred');
        var me                      = scope;
        var artifact                = me._hydratedArtifactsByOid[artifactOid];

        var artifactCollection          = artifact.getCollection('Tags',
                                            {fetch: ['ObjectID', 'Name']});
        var collectionCount             = artifactCollection.getCount();

        artifactCollection.load({
            callback: function(records, operation, success) {
                me._artifactTagsByOid[artifactOid] = records;
                deferred.resolve(records);
            }
        });
        return deferred;
    },

    _tagAllArtifacts: function(scope) {
        console.log('_tagAllArtifacts');
        var deferred                = Ext.create('Deft.Deferred');
        var me                      = scope;

        var promises = [];
        Ext.iterate(me._hydratedArtifactsByOid, function(key, value) {
            console.log(me);
            promises.push(me._tagArtifact(key, value, me));
        });

        Deft.Promise.all(promises).then({
            success: function(results) {
                deferred.resolve(results);
            }
        });
        return deferred;
    },

    _tagArtifact: function(artifactOid, artifact, scope) {
        console.log('_tagArtifact');

        var deferred                = Ext.create('Deft.Deferred');
        var me = scope;
        var existingArtifactTags = me._artifactTagsByOid[artifactOid];
        var newTagArray = [];
        var tagNamesToApply = [];

        if (!me._nullOutTagsFlag) {

            var existingTagNames = [];
            var existingTagRefs = [];
            Ext.Array.each(existingArtifactTags, function(tag) {
                existingTagNames.push(tag.get('Name'));
                existingTagRefs.push(tag.get('_ref'));
            });

            var selectedTagNames = me._selectedTagNames;
            var tagsRefsToApply = existingTagRefs;
            tagNamesToApply = existingTagNames;

            Ext.Array.each(me._selectedTagNames, function(selectedTagName) {
                console.log(selectedTagName);
                if (existingTagNames.indexOf(selectedTagName) === -1) {
                    var selectedTag = me._selectedTagsByName[selectedTagName];
                    tagsRefsToApply.push(selectedTag.get('_ref'));
                    tagNamesToApply.push(selectedTag.get('Name'));
                }
            });

            newTagArray = _.map(tagsRefsToApply, function(ref) { return {_ref: ref}; });
            console.log(newTagArray);
        }

        me._tagOperationNotify(artifact, tagNamesToApply, me);

        artifact.set('Tags', newTagArray);
        artifact.save({
            callback: function(result, operation) {
                console.log(operation.wasSuccessful());
                deferred.resolve(result);
            }
        });
        return deferred;
    },

    _tagOperationNotify: function(artifact, tagNamesArray, scope) {

        var me = scope;
        var artifactLabel = artifact.get('FormattedID');
        var newTagNames = "Empty tags.";

        if(tagNamesArray.length > 0) {
            newTagNames = tagNamesArray.join(", ");
        }

        var tagStatus = "Tagging " + artifactLabel + ": " + newTagNames;

        if (me._statusContent) {
            me._statusContent.destroy();
        }

        me._statusContent = Ext.create('Ext.container.Container', {
            itemId: 'statuscontent',
            xtype: 'container',
            html: tagStatus
        });

        me.down('#status').add(me._statusContent);

    },

    _noSelectionsNotify: function(scope) {

        if (this._statusContent) {
            this._statusContent.destroy();
        }

        this._statusContent = Ext.create('Ext.container.Container', {
            itemId: 'statuscontent',
            xtype: 'container',
            html: "Please select Features to Apply Tags To."
        });

        this.down('#status').add(this._statusContent);
    }

});
