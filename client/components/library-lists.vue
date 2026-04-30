<style lang="scss">
@use "../css/globals" as *;

#listContainer {
    flex: 0 0 auto;

    #lists {
        max-height: 25vh;
    }
}

.lpLibraryList {
    align-items: center;
    border-top: 1px dotted #999;
    display: flex;
    list-style: none;
    margin: 0 10px;
    overflow-y: auto;
    padding: 6px 0;
    position: relative;

    &:first-child {
        border-top: none;
        padding-top: 10px;
    }

    &:last-child {
        border-bottom: none;
    }

    &.lpActive {
        color: $yellow1;
    }

    &.gu-mirror {
        background: #606060;
        border: 1px solid #999;
        color: #fff;
    }

    .lpHandle {
        flex: 0 0 12px;
        height: 18px;
        margin-right: 5px;
        margin-top: 0;
    }

    &:hover .lpHandle {
        visibility: visible;
    }

    .lpListName {
        flex: 1 1 auto;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        &:hover {
            cursor: pointer;
            text-decoration: underline;
        }
    }

    .lpCopyList {
        cursor: pointer;
        flex: 0 0 14px;
        margin-right: 8px;
        visibility: hidden;

        .lpSpriteCopy {
            background: #3A3A3A;
            mask: url(/images/sprite2x.png?v=2) 0 -50px / 400px no-repeat;
            -webkit-mask: url(/images/sprite2x.png?v=2) 0 -50px / 400px no-repeat;
        }

        &:hover {
            .lpSpriteCopy {
                background: $green1;
            }
        }
    }

    &:hover .lpCopyList {
        visibility: visible;
    }

    .lpRemove {
        align-items: center;
        display: flex;
        flex: 0 0 20px;
        height: 20px;
        justify-content: center;
        margin-bottom: 0;
        padding: 0;

        &:hover {
            box-shadow: none;
        }

        .lpSpriteRemove {
            height: 9px;
            position: static;
            top: 0;
            transform: translateY(0.5px);
        }
    }
}

.listContainerHeader {
    display: flex;
    justify-content: space-between;
}

.addListOptions {
    a {
        display: block;
        margin-bottom: 5px;

        &:last-child {
            margin-bottom: 0;
        }
    }
}
</style>

<template>
    <section id="listContainer">
        <div class="listContainerHeader">
            <h2>Lists</h2>
            <PopoverHover id="addListFlyout">
                <template #target>
                    <span><a class="lpAdd" @click="newList"><i class="lpSprite lpSpriteAdd" />Add new list</a></span>
                </template>
                <template #content>
                    <div class="addListOptions">
                        <a class="lpAdd" @click="newList"><i class="lpSprite lpSpriteAdd" />Add new list</a>
                        <a class="lpAdd" @click="importCSV"><i class="lpSprite lpSpriteUpload" />Import CSV</a>
                        <a class="lpCopy" @click="showCopyList"><i class="lpSprite lpSpriteCopy" />Copy a list</a>
                    </div>
                </template>
            </PopoverHover>
        </div>
        <ul id="lists">
            <li v-for="list in library.lists" :key="list.id" class="lpLibraryList" :class="{lpActive: (library.defaultListId == list.id)}">
                <div class="lpHandle" title="Reorder this item" />
                <span class="lpLibraryListSwitch lpListName" @click="setDefaultList(list)">
                    {{ listName(list) }}
                </span>
                <a class="lpCopyList" title="Copy this list" @click="copyList(list)"><i class="lpSprite lpSpriteCopy" /></a>
                <a class="lpRemove" title="Remove this list" @click="removeList(list)"><i class="lpSprite lpSpriteRemove" /></a>
            </li>
        </ul>
    </section>
</template>

<script>
import dragula from 'dragula';
import PopoverHover from './popover-hover.vue';

export default {
    name: 'LibraryList',
    components: {
        PopoverHover,
    },
    props: ['list'],
    computed: {
        library() {
            return this.$store.state.library;
        },
    },
    mounted() {
        this.handleListReorder();
    },
    methods: {
        listName(list) {
            return list.name || 'New list';
        },
        setDefaultList(list) {
            this.$store.commit('setDefaultList', list);
        },
        newList() {
            this.$store.commit('newList');
        },
        showCopyList() {
            bus.$emit('copyList');
        },
        copyList(list) {
            this.$store.commit('copyList', list.id);
        },
        importCSV() {
            bus.$emit('importCSV');
        },
        handleListReorder() {
            const $lists = document.getElementById('lists');
            const drake = dragula([$lists], {
                moves($el, $source, $handle, $sibling) {
                    return $handle.classList.contains('lpHandle');
                },
            });
            drake.on('drag', ($el, $target, $source, $sibling) => {
                this.dragStartIndex = getElementIndex($el);
            });
            drake.on('drop', ($el, $target, $source, $sibling) => {
                this.$store.commit('reorderList', { before: this.dragStartIndex, after: getElementIndex($el) });
                drake.cancel(true);
            });
        },
        removeList(list) {
            const callback = function () {
                this.$store.commit('removeList', list);
            };
            const speedbumpOptions = {
                body: 'Are you sure you want to delete this list? This cannot be undone.',
            };
            bus.$emit('initSpeedbump', callback, speedbumpOptions);
        },
    },
};
</script>
