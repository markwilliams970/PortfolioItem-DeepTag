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
    _stuffToTag: [],
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
        this._selectedTags = this._tagPicker._getRecordValue();
    },

    _hydrateData: function() {

        var me = this;
        me._getSelectedFeatures();
        me._getSelectedTags();

        if (me._selectedTags.length === 0 || me._selectedFeatures.length === 0) {
            me._noSelectionsNotify();
            return;
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

        var promises = [
            hydrateFeaturesPromise,
            getStoriesCollectionPromise,
            hydrateStoriesPromise,
            getStoryTasksCollectionPromise,
            hydrateStoryTasksPromise,
            getStoryDefectsCollectionPromise,
            hydrateStoryDefectsPromise,
            getDefectTasksCollectionPromise,
            hydrateDefectTasksPromise
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
        Ext.Array.each(me._storiesCollectionOids, function(storyOid) {
            promises.push(me._hydrateArtifact(storyOid, 'HierarchicalRequirement', me));
        });

        Deft.Promise.all(promises).then({
            success: function(results) {
                me._hydratedStories = results;
                deferred.resolve(results);
            }
        });
        return deferred;
    },

    _hydrateStoryTasks: function(scope) {
        console.log('_hydrateStoryTasks');
        var me = scope;
        var promises = [];
        var deferred = Ext.create('Deft.Deferred');
        Ext.Array.each(me._storyTasksCollectionOids, function(taskOid) {
            promises.push(me._hydrateArtifact(taskOid, 'Task', me));
        });

        Deft.Promise.all(promises).then({
            success: function(results) {
                me._hydratedStoryTasks = results;
                console.log(results);
                deferred.resolve(results);
            }
        });
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
        Ext.Array.each(me._hydratedStories, function(story) {
            promises.push(me._hydrateArtifactCollection(story, 'Tasks', me, me._storyTasksCollectionOids));
        });

        Deft.Promise.all(promises).then({
            success: function(results) {
                console.log('_getStoryTaskCollections Resolve');
                console.log(results);
                deferred.resolve(results);
            }
        });

        return deferred;
    },

    _getStoryDefectsCollection: function(scope) {
        console.log('_getStoryDefectsCollection');
        var me = scope;
        var promises = [];
        var deferred = Ext.create('Deft.Deferred');
        Ext.Array.each(me._hydratedStories, function(story) {
            promises.push(me._hydrateArtifactCollection(story, 'Defects', me, me._storyDefectsCollectionOids));
        });

        Deft.Promise.all(promises).then({
            success: function(results) {
                console.log('_getStoryDefectsCollection Resolve');
                console.log(results);
                deferred.resolve(results);
            }
        });

        return deferred;
    },

    _hydrateStoryDefects: function(scope) {
        console.log('_hydrateStoryDefects');
        var me = scope;
        var promises = [];
        var deferred = Ext.create('Deft.Deferred');
        Ext.Array.each(me._storyDefectsCollectionOids, function(defectOid) {
            promises.push(me._hydrateArtifact(defectOid, 'Defect', me));
        });

        Deft.Promise.all(promises).then({
            success: function(results) {
                me._hydratedStoryDefects = results;
                console.log(results);
                deferred.resolve(results);
            }
        });
        return deferred;
    },

    _getDefectTaskCollections: function(scope) {
        console.log('_getDefectTaskCollections');
        var me = scope;
        var promises = [];
        var deferred = Ext.create('Deft.Deferred');
        Ext.Array.each(me._hydratedStoryDefects, function(defect) {
            promises.push(me._hydrateArtifactCollection(defect, 'Tasks', me, me._defectTasksCollectionOids));
        });

        Deft.Promise.all(promises).then({
            success: function(results) {
                console.log('_getDefectTaskCollections Resolve');
                console.log(results);
                deferred.resolve(results);
            }
        });

        return deferred;
    },

    _hydrateDefectTasks: function(scope) {
        console.log('_hydrateStoryTasks');
        var me = scope;
        var promises = [];
        var deferred = Ext.create('Deft.Deferred');
        Ext.Array.each(me._defectTasksCollectionOids, function(taskOid) {
            promises.push(me._hydrateArtifact(taskOid, 'Task', me));
        });

        Deft.Promise.all(promises).then({
            success: function(results) {
                me._hydratedDefectTasks = results;
                console.log(results);
                deferred.resolve(results);
            }
        });
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
                deferred.resolve(records);
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

    _noSelectionsNotify: function(scope) {

        if (this._statusContent) {
            this._statusContent.destroy();
        }

        this._statusContent = Ext.create('Ext.container.Container', {
            itemId: 'statuscontent',
            xtype: 'container',
            html: "Please select both Features and Tags to apply."
        });

        this.down('#status').add(this._statusContent);
    }

});
