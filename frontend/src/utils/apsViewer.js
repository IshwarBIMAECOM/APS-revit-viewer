

export async function findRoomsWithProperties(viewer, options = {}){
    if (!viewer || !viewer.model){
        throw new Error('Viewer and model are required')
    }
    const searchAttributes = options.searchAttributes || ['Category', 'Family', 'Type',]
    const propertiesToGet = options.properties || ['Name', 'Area', 'Volume', 'Level', 'Number']

    return new Promise((resolve, reject)=>{
        viewer.search(
            'Revit Rooms', async (roomDBIds)=>{
                try{
                    // If no rooms are found, return empty arrays
                    if (roomDBIds.length === 0){
                        resolve({
                            rooms: [],
                            roomFragments: [],
                            filteredFragments: getAllNonRoomFragments(viewer.model, [])
                        })
                        return 

                    }
                    //if rooms are found, get their properties
                    const roomProperties = new Promise((resolve, reject)=>{
                        viewer.model.getPropertyDb().getBulkProperties(roomDBIds, propertiesToGet,(results)=>resolve(results), (error)=>reject(error))})
                    const roomFragments = getRoomFragments(viewer.model, roomDbIds)
                    const filteredFragments = getAllNonRoomFragments(viewer.model, roomFragments)

                    resolve({
                        rooms: roomProperties.map(room =>({
                            dbId: room.dbId,
                            name: room.name,
                            properties: room.properties.reduce((acc, prop)=>{
                                acc[prop.displayName] = prop.displayValue
                                return acc
                            }, {})
                        })),
                        roomFragments: Array.from(roomFragments),
                        roomCount: roomDbIds.length,
                        totalFragments: viewer.model.getFragmentList().getCount()
                    })
                } catch (error){
                    reject(new Error(`Error finding rooms with properties ${error}`))   
                }
            }, (error) =>{
                reject(new Error(`Error searching for rooms ${error}`))
            }, searchAttributes, { searchHidden: options.searchHidden || false}
        )
    })
}

export async function findSpaceZonesWithProperties(viewer, options={}){
    if (!viewer || !viewer.model){
        throw new Error('Viewer and model are required')
    }
    const searchTerms = options.searchTerms || ['Revit Spaces', 'Revit Zones']
    const searchAttributes = options.searchAttributes || ['Category', 'Family', 'Type']
    const propertiesToGet = options.properties || ['Name', 'Area', 'Volume', 'Level', 'Number']

    const allSpaceZoneDbIds = new Set()
    const allSpaceZoneData = []
    let completedSearches = 0

    return new Promise((resolve, reject) =>{
        searchTerms.forEach(searchTerm =>{
            viewer.search(searchTerm, async(dbIds)=>{
                try{
                    dbIds.forEach(dbId => allSpaceZoneDbIds.add(dbId))
                    if (dbIds.length>0){
                        const properties = await new Promise((resolve, reject)=>{
                            viewer.model.getPropertyDb().getBulkProperties(dbIds, propertiesToGet, (results)=>resolve(results), (error)=>reject(error))
                        })
                        properties.forEach(item =>{
                            allSpaceZoneData.push({
                                dbId: item.dbId,
                                name: item.name,
                                type: searchTerm,
                                properties: item.properties.reduce((acc, prop) =>{
                                    acc[prop.displayName] = prop.displayValue
                                    return acc
                                }, {})

                            })
                        })    
                    }
                    completedSearches++
                    if (completedSearches === searchTerms.length){
                        const spaceZoneFragments = getRoomFragments(viewer.model, Array.from(allSpaceZoneDbIds))
                        const filteredFragments = getAllNonRoomFragments(viewer.model, spaceZoneFragments)
                        resolve({
                            spacesZones: allSpaceZoneData,
                            spaceZoneFragments: Array.from(spaceZoneFragments), 
                            filteredFragments,
                            spaceZoneCount: allSpaceZoneDbIds.size,
                            totalFragments: viewer.model.getFragmentList().getCount()
                        })
                    }
                } catch (error){
                    reject(new Error(`Failed to process ${searchTerm}: ${error}`))
                }
            }, (error)=>{
                console.warn(`Search for "${searchTerm}" failed:`, error)
                completedSearches++
                if (completedSearches === searchTerms.length){
                    const spaceZoneFragments = getRoomFragments(viewer.model, Array.from(allSpaceZoneDbIds))
                    const filteredFragments = getAllNonRoomFragments(viewer.model, spaceZoneFragments)
                    resolve({
                        spacesZones: allSpaceZoneData,
                        spaceZoneFragments: Array.from(spaceZoneFragments),
                        filteredFragments,
                        spaceZoneCount: allSpaceZoneDbIds.size,
                        totalFragments: viewer.model.getFragmentList().getCount()
                    })
                }
            }, searchAttributes, { searchHidden: options.searchHidden || false})
        })
    })
}


function getRoomFragments(model, dbIds){
    const fragList = model.getFragmentsList()
    const roomFragments = new Set()

    if (!fragList) return roomFragments

    const totalFragments = fragList.getCount()
    for(let fragId=0; fragId<totalFragments; fragId++){
        const dbId = fragList.fragments.fragId2dbId[fragId]
        if (dbId && dbIds.includes(dbId)){
            roomFragments.add(fragId)
        }
    }
    return roomFragments
}

function getAllNonRoomFragments(model, roomFragments){
    const fragList = model.getFragmentsList()
    if (!fragList) return new Set()
    
    const totalFragments = fragList.getCount()
    const filteredFragments = []

    for(let fragId = 0; fragId < totalFragments; fragId++){
        if (!roomFragments.has(fragId)){
            filteredFragments.push(fragId)
        }
    }
    return filteredFragments


}
export default {
    findRoomsWithProperties,
    findSpaceZonesWithProperties
}